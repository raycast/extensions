"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminderAnchorSec = reminderAnchorSec;
// reminder 触发锚的纯计算。保证「同步转换」与跨端用同一锚定义。
const DAY_SECS = 86400;
/**
 * reminder 触发锚：有精确 due 用 due，否则 belong 当天 24 点（次日 0 点）。
 * 仅用于 reminder offset 计算，区别于 scope 查询锚（belong 当天 0 点）。
 * ⚠️ 跨端契约：所有客户端须用同一锚定义，否则同步后提醒错时。
 */
function reminderAnchorSec(dueAt, belongAt) {
    if (dueAt && dueAt > 0)
        return dueAt;
    if (belongAt && belongAt > 0)
        return belongAt + DAY_SECS;
    return undefined;
}
