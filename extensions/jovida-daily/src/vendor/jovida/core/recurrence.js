"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ymdToKey = ymdToKey;
exports.ymdFromSec = ymdFromSec;
exports.seriesOccursOn = seriesOccursOn;
exports.seriesOccurrencesInRange = seriesOccurrencesInRange;
exports.occurrenceKey = occurrenceKey;
exports.nextOpenOccurrence = nextOpenOccurrence;
exports.occurrenceId = occurrenceId;
exports.parseOccurrenceId = parseOccurrenceId;
exports.occurrenceToEntry = occurrenceToEntry;
exports.expandRecurring = expandRecurring;
const convert_1 = require("./convert");
const ids_1 = require("./ids");
const MS_PER_DAY = 86400000;
const DAY = 86400;
function pad(n) {
    return String(n).padStart(2, '0');
}
function ymdToKey(c) {
    return `${c.y}-${pad(c.m)}-${pad(c.d)}`;
}
/** Unix 秒 → 本地 civil date。 */
function ymdFromSec(sec) {
    const d = new Date(sec * 1000);
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}
// daily/weekly 的间隔按 UTC 整天序号算(避开 DST 偏移,与 app 一致)。
function dayOrdinal(c) {
    return Math.floor(Date.UTC(c.y, c.m - 1, c.d) / MS_PER_DAY);
}
// ISO 周几:1=周一 .. 7=周日。
function isoWeekday(c) {
    const w = new Date(c.y, c.m - 1, c.d).getDay(); // 0=周日..6=周六
    return ((w + 6) % 7) + 1;
}
// 以本周一为起点的「周序号」(weekly 间隔按周一对齐的周计数)。
function weekOrdinal(c) {
    return Math.floor((dayOrdinal(c) - (isoWeekday(c) - 1)) / 7);
}
function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate(); // m 为 1-12:下月第 0 天 = 本月末日
}
function cmp(a, b) {
    return a.y - b.y || a.m - b.m || a.d - b.d;
}
/** series 起算锚(种子日):有 due 用 due 那天,否则 belong 那天。 */
function seriesStart(s) {
    return ymdFromSec(s.dueAt > 0 ? s.dueAt : s.belongAt);
}
/**
 * 某 series 是否在某一天发生(对齐 app `todoSeriesOccursOn`)。
 * 边界:monthly 月底夹取(31 号遇 2 月落 28);yearly 不夹取(平年 2/29 视为不发生)。
 */
function seriesOccursOn(s, day) {
    const start = seriesStart(s);
    if (cmp(day, start) < 0)
        return false;
    const r = s.repeat;
    if (r.endAt > 0 && cmp(day, ymdFromSec(r.endAt)) > 0)
        return false;
    const interval = r.interval > 0 ? r.interval : 1;
    switch (r.unit) {
        case 'day':
            return (dayOrdinal(day) - dayOrdinal(start)) % interval === 0;
        case 'week': {
            if ((weekOrdinal(day) - weekOrdinal(start)) % interval !== 0)
                return false;
            const wds = r.weekdays.filter((w) => w >= 1 && w <= 7);
            if (wds.length === 0)
                return isoWeekday(day) === isoWeekday(start); // 无 byWeekdays → 跟种子同一周几
            return wds.includes(isoWeekday(day));
        }
        case 'month': {
            if (((day.y - start.y) * 12 + (day.m - start.m)) % interval !== 0)
                return false;
            const target = r.dayOfMonth > 0 ? r.dayOfMonth : start.d;
            if (target < 1)
                return false;
            const dim = daysInMonth(day.y, day.m);
            return day.d === (target > dim ? dim : target); // 月底夹取
        }
        case 'year': {
            if ((day.y - start.y) % interval !== 0)
                return false;
            const tm = r.monthOfYear > 0 ? r.monthOfYear : start.m;
            const td = r.dayOfMonth > 0 ? r.dayOfMonth : start.d;
            if (tm < 1 || tm > 12)
                return false;
            if (td < 1 || td > daysInMonth(day.y, tm))
                return false; // 不夹取:越界即不发生
            return day.m === tm && day.d === td;
        }
        default:
            return false;
    }
}
/** 枚举 [fromSec, toSec] 内(本地日,两端含)所有发生日;limit 限制返回个数。 */
function seriesOccurrencesInRange(s, fromSec, toSec, limit = Number.POSITIVE_INFINITY) {
    const out = [];
    if (toSec < fromSec)
        return out;
    const start = seriesStart(s);
    // 扫描起点夹到 max(查询起点, 种子日),省掉种子前的无谓遍历。
    const cur = new Date(fromSec * 1000);
    cur.setHours(0, 0, 0, 0);
    const startDate = new Date(start.y, start.m - 1, start.d);
    if (cur < startDate)
        cur.setFullYear(start.y, start.m - 1, start.d);
    const end = new Date(toSec * 1000);
    end.setHours(0, 0, 0, 0);
    while (cur <= end && out.length < limit) {
        const c = { y: cur.getFullYear(), m: cur.getMonth() + 1, d: cur.getDate() };
        if (seriesOccursOn(s, c))
            out.push(c);
        cur.setDate(cur.getDate() + 1); // setDate 跨月/DST 自动归一
    }
    return out;
}
/** 去重 / fork 的发生 key:`<recurringId>|<YYYY-MM-DD>`(对齐 app,按天对齐)。 */
function occurrenceKey(recurringId, day) {
    return `${recurringId}|${ymdToKey(day)}`;
}
/**
 * 折叠模式(upcoming/all):找 series 在 [fromSec, horizonSec] 内「下一次仍需展示的发生」。
 * - 未 fork → 返回该日(调用方合成虚拟项)。
 * - 已 fork 且未完成 → 真实条目已在列表中 → 返回 null(不重复展示)。
 * - 已 fork 且已完成 → 跳过,看再下一次。
 */
function nextOpenOccurrence(s, fromSec, horizonSec, forked) {
    // 逐天走、命中即返回——不预构整段范围数组(daily 几乎首日即出;稀疏规则才走远)。
    if (horizonSec < fromSec)
        return null;
    const cur = new Date(fromSec * 1000);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(horizonSec * 1000);
    end.setHours(0, 0, 0, 0);
    while (cur <= end) {
        const day = { y: cur.getFullYear(), m: cur.getMonth() + 1, d: cur.getDate() };
        if (seriesOccursOn(s, day)) {
            const real = forked.get(occurrenceKey(s.recurringId, day));
            if (!real)
                return day;
            if (real.completedAt === 0)
                return null; // open 真实条目已展示 → 不再补虚拟
            // completed → 继续找下一次
        }
        cur.setDate(cur.getDate() + 1);
    }
    return null;
}
/** fork / 虚拟发生的**确定性** id:`recurring:<recurringId>:<发生日本地0点秒>`。 */
/* 同一时区的设备 fork 同一发生 → 生成同 id → 后端按 (user,entry_id) upsert 合并不重复。 */
/* 注意:秒数取自**本地**当天 0 点,故不同时区的设备对「同一天」会算出不同秒→不同 id(与官方 app 同源的设计取舍,非本端缺陷)。 */
function occurrenceId(recurringId, occurrenceSec) {
    return `recurring:${recurringId}:${occurrenceSec}`;
}
/** 解析发生 id;非该形态返回 null。 */
function parseOccurrenceId(id) {
    if (!id.startsWith('recurring:'))
        return null;
    const last = id.lastIndexOf(':');
    if (last <= 9)
        return null; // 9 = 'recurring:' 里那个冒号的下标;须有第二个冒号
    const recurringId = id.slice(10, last);
    const secsStr = id.slice(last + 1);
    if (!recurringId || !/^\d+$/.test(secsStr))
        return null;
    return { recurringId, occurrenceSec: Number(secsStr) };
}
/**
 * series 的某次发生 → TodoEntry(虚拟展示项,亦即 fork 的材料化形态)。
 * 字段从 series 继承;id/belong/occurrenceAt 由发生日派生;completedAt=0(由调用方在 complete 时置)。
 */
function occurrenceToEntry(s, day) {
    const occSec = (0, convert_1.belongDateToSec)(ymdToKey(day)); // 本地当天 0 点秒
    let dueAt = 0;
    if (s.dueAt > 0) {
        // series 带时刻 → 该发生继承「同一时分秒」落在发生日。
        const t = new Date(s.dueAt * 1000);
        dueAt = Math.floor(new Date(day.y, day.m - 1, day.d, t.getHours(), t.getMinutes(), t.getSeconds()).getTime() / 1000);
    }
    return {
        entryId: occurrenceId(s.recurringId, occSec),
        title: s.title,
        description: s.description,
        category: s.category,
        priority: s.priority,
        dueAt,
        belongAt: occSec,
        recurringId: s.recurringId,
        occurrenceAt: occSec,
        subtasks: s.subtasks.map((st) => ({ id: (0, ids_1.newSubtaskId)(), title: st.title, completedAt: 0 })),
        reminder: s.reminder ? { ...s.reminder } : null,
        completedAt: 0,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        hint: '',
        images: s.images ? s.images.map((im) => ({ ...im })) : undefined // 继承「类」的图片(透传保留)
    };
}
/**
 * 展开循环规则为虚拟发生 TodoEntry[](混入 list)。混合策略:
 * - today:展开当天全部发生(单日,每 series ≤1)。
 * - range:展开 [from,to] 窗口内**每一次**发生(用户显式查窗口,如「未来一周」)。
 * - upcoming / all:每条 series **折叠**为「下一次 open 发生」(防高频例行刷屏)。
 * - recent:不展开(只看真实触碰过的条目)。
 * 已 fork 的真实发生不重复合成(按 occurrenceKey 去重)。status=completed 时不展开(虚拟发生恒 pending)。
 */
function expandRecurring(opts) {
    const { recurrings, realEntries, scope, status, todayStart, tomorrowStart } = opts;
    if (status === 'completed' || scope === 'recent')
        return [];
    const forked = new Map();
    for (const e of realEntries) {
        if (e.recurringId && e.occurrenceAt > 0) {
            forked.set(occurrenceKey(e.recurringId, ymdFromSec(e.occurrenceAt)), e);
        }
    }
    const out = [];
    const emitFull = (from, to) => {
        for (const s of recurrings) {
            for (const day of seriesOccurrencesInRange(s, from, to)) {
                if (!forked.has(occurrenceKey(s.recurringId, day)))
                    out.push(occurrenceToEntry(s, day));
            }
        }
    };
    if (scope === 'today') {
        emitFull(todayStart, tomorrowStart - 1);
    }
    else if (scope === 'range') {
        const to = opts.rangeTo === Number.POSITIVE_INFINITY ? opts.rangeFrom + opts.horizonDays * DAY : opts.rangeTo;
        emitFull(opts.rangeFrom, to);
    }
    else {
        // upcoming / all:折叠成每 series 的下一次 open 发生
        const from = scope === 'upcoming' ? tomorrowStart : todayStart;
        const horizonEnd = todayStart + opts.collapseHorizonDays * DAY;
        for (const s of recurrings) {
            const next = nextOpenOccurrence(s, from, horizonEnd, forked);
            if (next)
                out.push(occurrenceToEntry(s, next));
        }
    }
    return out;
}
