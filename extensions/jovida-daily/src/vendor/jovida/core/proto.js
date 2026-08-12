"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.entryToItem = entryToItem;
exports.recurringToItem = recurringToItem;
exports.itemToEntry = itemToEntry;
exports.itemToRecurring = itemToRecurring;
exports.itemIsRecurringRule = itemIsRecurringRule;
// ---- priority enum ↔ 本地字符串 ----
const PRIORITY_TO_PROTO = {
    none: 'PRIORITY_NONE',
    low: 'PRIORITY_LOW',
    medium: 'PRIORITY_MEDIUM',
    high: 'PRIORITY_HIGH'
};
// 名字或序号都接受（protojson 通常回名字，但容错数字）。UNSPECIFIED/缺省 → 'none'。
function priorityFromProto(v) {
    switch (v) {
        case 'PRIORITY_LOW':
        case 2:
            return 'low';
        case 'PRIORITY_MEDIUM':
        case 3:
            return 'medium';
        case 'PRIORITY_HIGH':
        case 4:
            return 'high';
        default:
            return 'none'; // PRIORITY_NONE(1) / UNSPECIFIED(0) / 省略
    }
}
// int64：写出转字符串（canonical proto3-JSON）；读入用 Number（时间戳/秒在 JS 安全整数内）。
function i64(n) {
    return String(n);
}
function num(v) {
    return v == null ? 0 : Number(v);
}
// ---- RepeatUnit / Weekday enum ↔ 本地 ----
const UNIT_TO_PROTO = {
    day: 'REPEAT_UNIT_DAY',
    week: 'REPEAT_UNIT_WEEK',
    month: 'REPEAT_UNIT_MONTH',
    year: 'REPEAT_UNIT_YEAR',
    hour: 'REPEAT_UNIT_HOUR'
};
function unitFromProto(v) {
    switch (v) {
        case 'REPEAT_UNIT_WEEK':
        case 2:
            return 'week';
        case 'REPEAT_UNIT_MONTH':
        case 3:
            return 'month';
        case 'REPEAT_UNIT_YEAR':
        case 4:
            return 'year';
        case 'REPEAT_UNIT_HOUR':
        case 5:
            return 'hour';
        default:
            return 'day'; // REPEAT_UNIT_DAY(1) / UNSPECIFIED(0) / 省略
    }
}
const WEEKDAY_NAMES = [
    'WEEKDAY_UNSPECIFIED',
    'WEEKDAY_MONDAY',
    'WEEKDAY_TUESDAY',
    'WEEKDAY_WEDNESDAY',
    'WEEKDAY_THURSDAY',
    'WEEKDAY_FRIDAY',
    'WEEKDAY_SATURDAY',
    'WEEKDAY_SUNDAY'
];
// 本地 ISO 1-7 → proto enum 名。
function weekdayToProto(iso) {
    return WEEKDAY_NAMES[iso] ?? 'WEEKDAY_UNSPECIFIED';
}
// proto enum 名或序号 → 本地 ISO 1-7（无效返回 0，调用方过滤）。
function weekdayFromProto(v) {
    if (typeof v === 'number')
        return v >= 1 && v <= 7 ? v : 0;
    const i = WEEKDAY_NAMES.indexOf(String(v));
    return i >= 1 ? i : 0;
}
// 提醒渠道 enum:序号 → 名字(protojson 回名字,容错数字);名字原样保留。CLI 不解释渠道,只透传。
const CHANNEL_NAMES = [
    'TODO_REMINDER_CHANNEL_UNSPECIFIED',
    'TODO_REMINDER_CHANNEL_NOTIFICATION',
    'TODO_REMINDER_CHANNEL_ALARM',
    'TODO_REMINDER_CHANNEL_VOICE_CALL',
    'TODO_REMINDER_CHANNEL_FOLLOW_UP'
];
function channelToName(v) {
    if (typeof v === 'number')
        return CHANNEL_NAMES[v] ?? CHANNEL_NAMES[0];
    return String(v);
}
function subtaskToProto(s) {
    return { id: s.id, title: s.title, completedAt: i64(s.completedAt) };
}
function subtasksFromProto(arr) {
    return (arr ?? []).map((s) => ({ id: s.id ?? '', title: s.title ?? '', completedAt: num(s.completedAt) }));
}
function reminderToProto(r) {
    const out = { id: r.id, canAlarm: r.canAlarm, offsetSecs: r.offsetSecs.map(i64) };
    if (r.enabled !== undefined)
        out.enabled = r.enabled;
    if (r.channels && r.channels.length)
        out.channels = r.channels;
    return out;
}
function reminderFromProto(o) {
    if (!o)
        return null;
    const r = {
        id: o.id ?? '',
        canAlarm: o.canAlarm ?? false,
        offsetSecs: (o.offsetSecs ?? []).map(num)
    };
    if (o.enabled !== undefined)
        r.enabled = o.enabled;
    if (o.channels && o.channels.length)
        r.channels = o.channels.map(channelToName);
    return r;
}
function imageToProto(im) {
    const out = {};
    if (im.objectId !== undefined)
        out.objectId = im.objectId;
    if (im.url !== undefined)
        out.url = im.url;
    if (im.mimeType !== undefined)
        out.mimeType = im.mimeType;
    if (im.name !== undefined)
        out.name = im.name;
    if (im.description !== undefined)
        out.description = im.description;
    if (im.abstract !== undefined)
        out.abstract = im.abstract;
    if (im.data !== undefined)
        out.data = im.data;
    if (im.sourceText !== undefined)
        out.sourceText = im.sourceText;
    return out;
}
function imagesFromProto(arr) {
    if (!arr || arr.length === 0)
        return undefined;
    return arr.map((o) => ({
        objectId: o.objectId,
        url: o.url,
        mimeType: o.mimeType,
        name: o.name,
        description: o.description,
        abstract: o.abstract,
        data: o.data,
        sourceText: o.sourceText
    }));
}
function repeatToProto(r) {
    return {
        unit: UNIT_TO_PROTO[r.unit],
        interval: r.interval,
        weekdays: r.weekdays.map(weekdayToProto),
        dayOfMonth: r.dayOfMonth,
        monthOfYear: r.monthOfYear,
        endAt: i64(r.endAt)
    };
}
function repeatFromProto(r) {
    return {
        unit: unitFromProto(r.unit),
        interval: Math.max(1, num(r.interval)),
        weekdays: (r.weekdays ?? []).map(weekdayFromProto).filter((w) => w >= 1 && w <= 7),
        dayOfMonth: num(r.dayOfMonth),
        monthOfYear: num(r.monthOfYear),
        endAt: num(r.endAt)
    };
}
// ---- 统一对象 TodoItem(线格式)----
const ITEM_TYPE_SINGLE = 'TODO_ITEM_TYPE_SINGLE';
const ITEM_TYPE_RECURRING_RULE = 'TODO_ITEM_TYPE_RECURRING_RULE';
const ITEM_TYPE_RECURRING_OCCURRENCE = 'TODO_ITEM_TYPE_RECURRING_OCCURRENCE';
// itemType 判别(名字或序号)。
function isRecurringRule(v) {
    return v === ITEM_TYPE_RECURRING_RULE || v === 2;
}
// ---- 本地 → TodoItem ----
// 普通待办 或 已 fork 的循环发生 → TodoItem(单态 / 发生态)。
function entryToItem(e) {
    const occurrence = !!e.recurringId;
    const out = {
        itemId: e.entryId,
        itemType: occurrence ? ITEM_TYPE_RECURRING_OCCURRENCE : ITEM_TYPE_SINGLE,
        title: e.title,
        description: e.description,
        category: e.category,
        priority: PRIORITY_TO_PROTO[e.priority],
        dueAt: i64(e.dueAt),
        belongAt: i64(e.belongAt),
        subtasks: e.subtasks.map(subtaskToProto),
        completedAt: i64(e.completedAt),
        createdAt: i64(e.createdAt),
        updatedAt: i64(e.updatedAt)
    };
    if (occurrence) {
        out.parentRuleId = e.recurringId;
        out.occurrenceAt = i64(e.occurrenceAt);
    }
    if (e.reminder)
        out.reminder = reminderToProto(e.reminder);
    if (e.images && e.images.length)
        out.images = e.images.map(imageToProto);
    return out;
}
// 循环「类」→ TodoItem(规则态;无 completedAt/parentRuleId/occurrenceAt)。
function recurringToItem(s) {
    const out = {
        itemId: s.recurringId,
        itemType: ITEM_TYPE_RECURRING_RULE,
        title: s.title,
        description: s.description,
        category: s.category,
        priority: PRIORITY_TO_PROTO[s.priority],
        dueAt: i64(s.dueAt),
        belongAt: i64(s.belongAt),
        repeatRule: repeatToProto(s.repeat),
        subtasks: s.subtasks.map(subtaskToProto),
        createdAt: i64(s.createdAt),
        updatedAt: i64(s.updatedAt)
    };
    if (s.reminder)
        out.reminder = reminderToProto(s.reminder);
    if (s.images && s.images.length)
        out.images = s.images.map(imageToProto);
    return out;
}
// ---- TodoItem → 本地 ----
function itemToEntry(o) {
    return {
        entryId: o.itemId ?? '',
        title: o.title ?? '',
        description: o.description ?? '',
        category: o.category ?? '',
        priority: priorityFromProto(o.priority),
        dueAt: num(o.dueAt),
        belongAt: num(o.belongAt),
        recurringId: o.parentRuleId ?? '',
        occurrenceAt: num(o.occurrenceAt),
        subtasks: subtasksFromProto(o.subtasks),
        reminder: reminderFromProto(o.reminder),
        completedAt: num(o.completedAt),
        createdAt: num(o.createdAt),
        updatedAt: num(o.updatedAt),
        hint: '', // hint 是本地列、不在同步 proto；importFromServer 会保留本地既有 hint，不被此 '' 覆盖
        images: imagesFromProto(o.images)
    };
}
function itemToRecurring(o) {
    return {
        recurringId: o.itemId ?? '',
        title: o.title ?? '',
        description: o.description ?? '',
        category: o.category ?? '',
        priority: priorityFromProto(o.priority),
        dueAt: num(o.dueAt),
        belongAt: num(o.belongAt),
        subtasks: subtasksFromProto(o.subtasks),
        reminder: reminderFromProto(o.reminder),
        repeat: repeatFromProto(o.repeatRule ?? {}),
        createdAt: num(o.createdAt),
        updatedAt: num(o.updatedAt),
        images: imagesFromProto(o.images)
    };
}
/** 一条 TodoItem 是否为循环「类」(规则态);否则视为 entry(单态或发生态)。 */
function itemIsRecurringRule(o) {
    return isRecurringRule(o.itemType);
}
