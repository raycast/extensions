"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.entryToProto = entryToProto;
exports.entryFromProto = entryFromProto;
exports.recurringToProto = recurringToProto;
exports.recurringFromProto = recurringFromProto;
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
    year: 'REPEAT_UNIT_YEAR'
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
function entryToProto(e) {
    const out = {
        entryId: e.entryId,
        title: e.title,
        description: e.description,
        category: e.category,
        priority: PRIORITY_TO_PROTO[e.priority],
        dueAt: i64(e.dueAt),
        belongAt: i64(e.belongAt),
        recurringId: e.recurringId,
        occurrenceAt: i64(e.occurrenceAt),
        subtasks: e.subtasks.map((s) => ({ id: s.id, title: s.title, completedAt: i64(s.completedAt) })),
        completedAt: i64(e.completedAt),
        createdAt: i64(e.createdAt),
        updatedAt: i64(e.updatedAt)
    };
    if (e.reminder) {
        out.reminder = {
            id: e.reminder.id,
            canAlarm: e.reminder.canAlarm,
            offsetSecs: e.reminder.offsetSecs.map(i64)
        };
    }
    return out;
}
function entryFromProto(o) {
    const subtasks = (o.subtasks ?? []).map((s) => ({
        id: s.id ?? '',
        title: s.title ?? '',
        completedAt: num(s.completedAt)
    }));
    let reminder = null;
    if (o.reminder) {
        reminder = {
            id: o.reminder.id ?? '',
            canAlarm: o.reminder.canAlarm ?? false,
            offsetSecs: (o.reminder.offsetSecs ?? []).map(num)
        };
    }
    return {
        entryId: o.entryId ?? '',
        title: o.title ?? '',
        description: o.description ?? '',
        category: o.category ?? '',
        priority: priorityFromProto(o.priority),
        dueAt: num(o.dueAt),
        belongAt: num(o.belongAt),
        recurringId: o.recurringId ?? '',
        occurrenceAt: num(o.occurrenceAt),
        subtasks,
        reminder,
        completedAt: num(o.completedAt),
        createdAt: num(o.createdAt),
        updatedAt: num(o.updatedAt),
        hint: '' // hint 是本地列、不在同步 proto；importFromServer 会保留本地既有 hint，不被此 '' 覆盖
    };
}
function recurringToProto(s) {
    const out = {
        recurringId: s.recurringId,
        title: s.title,
        description: s.description,
        category: s.category,
        priority: PRIORITY_TO_PROTO[s.priority],
        dueAt: i64(s.dueAt),
        belongAt: i64(s.belongAt),
        subtasks: s.subtasks.map((t) => ({ id: t.id, title: t.title, completedAt: i64(t.completedAt) })),
        repeatRule: {
            unit: UNIT_TO_PROTO[s.repeat.unit],
            interval: s.repeat.interval,
            weekdays: s.repeat.weekdays.map(weekdayToProto),
            dayOfMonth: s.repeat.dayOfMonth,
            monthOfYear: s.repeat.monthOfYear,
            endAt: i64(s.repeat.endAt)
        },
        createdAt: i64(s.createdAt),
        updatedAt: i64(s.updatedAt)
    };
    if (s.reminder) {
        out.reminder = {
            id: s.reminder.id,
            canAlarm: s.reminder.canAlarm,
            offsetSecs: s.reminder.offsetSecs.map(i64)
        };
    }
    return out;
}
function recurringFromProto(o) {
    const subtasks = (o.subtasks ?? []).map((s) => ({
        id: s.id ?? '',
        title: s.title ?? '',
        completedAt: num(s.completedAt)
    }));
    let reminder = null;
    if (o.reminder) {
        reminder = {
            id: o.reminder.id ?? '',
            canAlarm: o.reminder.canAlarm ?? false,
            offsetSecs: (o.reminder.offsetSecs ?? []).map(num)
        };
    }
    const r = o.repeatRule ?? {};
    const repeat = {
        unit: unitFromProto(r.unit),
        interval: Math.max(1, num(r.interval)),
        weekdays: (r.weekdays ?? []).map(weekdayFromProto).filter((w) => w >= 1 && w <= 7),
        dayOfMonth: num(r.dayOfMonth),
        monthOfYear: num(r.monthOfYear),
        endAt: num(r.endAt)
    };
    return {
        recurringId: o.recurringId ?? '',
        title: o.title ?? '',
        description: o.description ?? '',
        category: o.category ?? '',
        priority: priorityFromProto(o.priority),
        dueAt: num(o.dueAt),
        belongAt: num(o.belongAt),
        subtasks,
        reminder,
        repeat,
        createdAt: num(o.createdAt),
        updatedAt: num(o.updatedAt)
    };
}
