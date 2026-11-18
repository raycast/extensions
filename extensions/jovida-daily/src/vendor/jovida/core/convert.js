"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isoToSec = isoToSec;
exports.secToIso = secToIso;
exports.belongDateToSec = belongDateToSec;
exports.secToBelongDate = secToBelongDate;
exports.normalizeRepeatUnit = normalizeRepeatUnit;
exports.parseWeekdays = parseWeekdays;
exports.mergeRepeat = mergeRepeat;
exports.repeatToOutput = repeatToOutput;
exports.toDraft = toDraft;
exports.mergeDraft = mergeDraft;
exports.toListItem = toListItem;
exports.toFullTodo = toFullTodo;
exports.toSeriesTodo = toSeriesTodo;
const ids_1 = require("./ids");
const reminder_1 = require("./reminder");
// ---- 标量 ----
function isoToSec(iso) {
    const ms = Date.parse(iso);
    if (Number.isNaN(ms))
        throw new Error(`Cannot parse time (ISO 8601 required): ${iso}`);
    return Math.floor(ms / 1000);
}
function secToIso(sec) {
    return new Date(sec * 1000).toISOString();
}
/** YYYY-MM-DD → 本地时区当天 0 点的 Unix 秒（belong_at 锚点）。 */
function belongDateToSec(date) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!m)
        throw new Error(`Date must be YYYY-MM-DD: ${date}`);
    return Math.floor(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() / 1000);
}
/** Unix 秒 → 本地时区 YYYY-MM-DD。 */
function secToBelongDate(sec) {
    const d = new Date(sec * 1000);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
/**
 * 单个 `when` → 存储的 { dueAt, belongAt }。
 * - 纯日期 `2026-06-05` → 那天的事：belongAt=当天 0 点，无 due。
 * - 带时刻 `2026-06-05T18:00:00+08:00` → 精确截止：dueAt=该时刻，belongAt 派生=due 那天 0 点。
 * 不变量：有 due ⇒ belong = due 那天（belong/due 是同一时间点的两种精度，不允许分属不同天）。
 */
function whenToTime(when) {
    if (when === undefined)
        return {};
    if (DATE_ONLY.test(when))
        return { belongAt: belongDateToSec(when) };
    const dueAt = isoToSec(when);
    return { dueAt, belongAt: belongDateToSec(secToBelongDate(dueAt)) };
}
// repeat 入参 → 存储 RepeatRule。until（日期或时刻）→ endAt（落在结束日即可，发生计算按「日」比较）。
function toRepeat(r) {
    if (!r)
        return undefined;
    let endAt = 0;
    if (r.until)
        endAt = DATE_ONLY.test(r.until) ? belongDateToSec(r.until) : isoToSec(r.until);
    return {
        unit: r.unit,
        interval: r.interval && r.interval > 0 ? r.interval : 1,
        weekdays: (r.weekdays ?? []).filter((w) => Number.isInteger(w) && w >= 1 && w <= 7),
        dayOfMonth: r.day_of_month ?? 0,
        monthOfYear: r.month_of_year ?? 0,
        endAt
    };
}
// --repeat 取值(含 daily/weekly… 别名)→ 存储 unit。create / update 共用。
const UNIT_ALIAS = {
    day: 'day',
    daily: 'day',
    week: 'week',
    weekly: 'week',
    month: 'month',
    monthly: 'month',
    year: 'year',
    yearly: 'year'
};
function normalizeRepeatUnit(s) {
    return UNIT_ALIAS[s.trim().toLowerCase()];
}
const WEEKDAY_ALIAS = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7 };
/** "mon,wed,fri" 或 "1,3,5" → ISO 1-7 数组(空/无效 → undefined)。 */
function parseWeekdays(s) {
    if (!s)
        return undefined;
    const out = s
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
        .map((x) => WEEKDAY_ALIAS[x] ?? Number(x))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);
    return out.length ? out : undefined;
}
/**
 * 在原 RepeatRule 上覆盖传入的部分字段(update 重复待办用)。
 * 改 unit 时清掉不再适用的字段(如 week→month 丢弃 weekdays);只想微调时无需重给整条。
 */
function mergeRepeat(cur, c) {
    const unit = c.unit ?? cur.unit;
    let endAt = cur.endAt;
    if (c.until)
        endAt = DATE_ONLY.test(c.until) ? belongDateToSec(c.until) : isoToSec(c.until);
    // 每个字段按「新 unit 是否使用」决定:使用则保留原值(除非本次传了新值),不使用则清。
    // 注意 day_of_month 同时被 month 和 year 用,故 month↔year 切换不应清它。
    return {
        unit,
        interval: c.interval && c.interval > 0 ? c.interval : cur.interval,
        weekdays: unit === 'week' ? (c.weekdays ?? cur.weekdays).filter((w) => Number.isInteger(w) && w >= 1 && w <= 7) : [],
        dayOfMonth: unit === 'month' || unit === 'year' ? c.day_of_month ?? cur.dayOfMonth : 0,
        monthOfYear: unit === 'year' ? c.month_of_year ?? cur.monthOfYear : 0,
        endAt
    };
}
function toSubtasks(items) {
    return items?.map((s) => ({ id: (0, ids_1.newSubtaskId)(), title: s.title, completedAt: 0 }));
}
/**
 * update 重设子任务列表时,按 title 匹配旧子任务、保留其 id + 完成状态;只有新 title 才新建。
 * 避免「整列重写」把别端勾过的完成状态/id 清零(细粒度勾选另走 `jovida subtask`)。
 */
function mergeSubtasks(incoming, existing) {
    const used = new Set();
    return incoming.map((s) => {
        const idx = existing.findIndex((e, i) => !used.has(i) && e.title === s.title);
        if (idx >= 0) {
            used.add(idx);
            return existing[idx];
        }
        return { id: (0, ids_1.newSubtaskId)(), title: s.title, completedAt: 0 };
    });
}
// reminder 触发锚 reminderAnchorSec 见 capability/reminder/triggers.ts（与调度器共用）。
// remind_at（一个或多个 ISO 绝对时刻）→ Reminder。每个 offset = 锚 − remind_at，须 ≥0（提醒只能在锚前）。
function toReminder(remindAt, dueAt, belongAt) {
    if (remindAt === undefined)
        return undefined;
    const list = Array.isArray(remindAt) ? remindAt : [remindAt];
    if (list.length === 0)
        return undefined;
    const anchor = (0, reminder_1.reminderAnchorSec)(dueAt, belongAt);
    if (anchor === undefined)
        throw new Error('A reminder needs the todo to have a time first (when: a date or datetime)');
    const offsetSecs = list.map((r) => {
        const off = anchor - isoToSec(r);
        if (off < 0)
            throw new Error(`Reminder time (${r}) is after the todo — it must be at or before the deadline / end of the belong day`);
        return off;
    });
    return { id: (0, ids_1.newReminderId)(), canAlarm: true, offsetSecs };
}
/**
 * 无 when 但有 remind_at 时的归属兜底（用户定 2026-06-09）：belongAt = 【最晚】一条提醒的日期 0 点，
 * 不设 due（提醒≠截止）。否则 toReminder 因无锚抛错 → 提案静默建不出来。
 * 取「最晚」（而非最早）：锚 = belong+1天（归属日结束）须 ≥ 所有提醒才都合法、不被「晚于归属」拒。
 */
function belongFromReminders(remindAt) {
    if (remindAt === undefined)
        return undefined;
    const list = Array.isArray(remindAt) ? remindAt : [remindAt];
    if (list.length === 0)
        return undefined;
    const latest = Math.max(...list.map(isoToSec));
    return belongDateToSec(secToBelongDate(latest));
}
// 存储 Reminder → remind_at 列表（ISO）：锚 − 各 offset。用于读工具回显（与入参对称）。
// 结构化入参（dueAt/belongAt/reminder）→ entry 与 recurring「类」通用。
function reminderToIsoList(e) {
    if (!e.reminder || e.reminder.offsetSecs.length === 0)
        return undefined;
    const anchor = (0, reminder_1.reminderAnchorSec)(e.dueAt, e.belongAt);
    if (anchor === undefined)
        return undefined;
    return e.reminder.offsetSecs.map((o) => secToIso(anchor - o));
}
function reminderChannels(e) {
    return e.reminder?.channels && e.reminder.channels.length ? e.reminder.channels : undefined;
}
// 存储 RepeatRule → 输出（与入参对称，按 unit 只给相关字段）。
function repeatToOutput(r) {
    const out = { unit: r.unit, interval: r.interval };
    if (r.unit === 'week' && r.weekdays.length > 0)
        out.weekdays = r.weekdays;
    if ((r.unit === 'month' || r.unit === 'year') && r.dayOfMonth > 0)
        out.day_of_month = r.dayOfMonth;
    if (r.unit === 'year' && r.monthOfYear > 0)
        out.month_of_year = r.monthOfYear;
    if (r.endAt > 0)
        out.until = secToBelongDate(r.endAt);
    return out;
}
// 存储 → 单个 when：有 due 回显完整时刻，否则回显归属日期。
function toWhen(e) {
    if (e.dueAt > 0)
        return secToIso(e.dueAt);
    if (e.belongAt > 0)
        return secToBelongDate(e.belongAt);
    return undefined;
}
function toDraft(item) {
    const { dueAt, belongAt: belongFromWhen } = whenToTime(item.when);
    // 无 when（due/belong 皆无）但有 remind_at → 归属兜底到最晚提醒那天，使 toReminder 有锚可算。
    const belongAt = belongFromWhen ?? belongFromReminders(item.remind_at);
    return {
        title: item.title,
        description: item.description,
        category: item.category,
        priority: item.priority,
        dueAt,
        belongAt,
        subtasks: toSubtasks(item.subtasks),
        reminder: toReminder(item.remind_at, dueAt, belongAt),
        hint: item.hint,
        repeat: toRepeat(item.repeat)
    };
}
/** update：读当前 target、用 changes 覆盖，产出完整 draft（与后端整条覆盖语义一致）。 */
function mergeDraft(target, changes) {
    // 改了 when 才重新分流；否则沿用 target 的 due/belong。
    const { dueAt, belongAt: belongFromWhen } = changes.when !== undefined
        ? whenToTime(changes.when)
        : { dueAt: target.dueAt || undefined, belongAt: target.belongAt || undefined };
    // 仍无 due/belong（target 也没）但本次改了 remind_at → 同 toDraft，兜底到最晚提醒那天。
    const belongAt = belongFromWhen ?? belongFromReminders(changes.remind_at);
    return {
        title: changes.title ?? target.title,
        description: changes.description ?? target.description,
        category: changes.category ?? target.category,
        priority: changes.priority ?? target.priority,
        dueAt,
        belongAt,
        subtasks: changes.subtasks !== undefined ? mergeSubtasks(changes.subtasks, target.subtasks) : target.subtasks,
        // 改了 remind_at 才按新锚重算；否则保留原 offset（锚变则提醒时刻随之平移，符合"提前量"语义）
        reminder: changes.remind_at !== undefined ? toReminder(changes.remind_at, dueAt, belongAt) : (target.reminder ?? undefined),
        hint: changes.hint ?? target.hint
    };
}
// ---- 存储 → 接口返回 ----
function toListItem(e) {
    return {
        entry_id: e.entryId,
        title: e.title,
        when: toWhen(e),
        priority: e.priority,
        status: e.completedAt > 0 ? 'completed' : 'pending',
        category: e.category,
        // 循环发生（材料化的或虚发生）带回 recurring_id，AI 据此知道这是循环待办的某次发生。
        recurring_id: e.recurringId || undefined
    };
}
/** entry 完整视图。`repeat` 仅当调用方查到所属「类」时传入（材料化/虚发生回显其循环规则）。 */
function toFullTodo(e, repeat) {
    return {
        entry_id: e.entryId,
        title: e.title,
        description: e.description,
        category: e.category,
        priority: e.priority,
        when: toWhen(e),
        subtasks: e.subtasks.map((s) => ({ id: s.id, title: s.title, completed: s.completedAt > 0 })),
        remind_at: reminderToIsoList(e),
        reminder_channels: reminderChannels(e),
        hint: e.hint || undefined,
        status: e.completedAt > 0 ? 'completed' : 'pending',
        completed_at: e.completedAt > 0 ? secToIso(e.completedAt) : undefined,
        recurring_id: e.recurringId || undefined,
        repeat_date: e.occurrenceAt > 0 ? secToBelongDate(e.occurrenceAt) : undefined,
        repeat: repeat ? repeatToOutput(repeat) : undefined,
        created_at: secToIso(e.createdAt),
        updated_at: secToIso(e.updatedAt)
    };
}
/** 重复待办视图（todo_get 传入 recurring_id 时返回）。规则本身即完整排程,不枚举发生。 */
function toSeriesTodo(s) {
    return {
        recurring_id: s.recurringId,
        type: 'repeating',
        title: s.title,
        description: s.description,
        category: s.category,
        priority: s.priority,
        when: s.dueAt > 0 ? secToIso(s.dueAt) : secToBelongDate(s.belongAt), // 首次日期（种子）
        subtasks: s.subtasks.map((st) => ({ id: st.id, title: st.title, completed: st.completedAt > 0 })),
        remind_at: reminderToIsoList(s),
        reminder_channels: reminderChannels(s),
        repeat: repeatToOutput(s.repeat),
        created_at: secToIso(s.createdAt),
        updated_at: secToIso(s.updatedAt)
    };
}
