"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.relativeTime = relativeTime;
exports.snippet = snippet;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
function relativeTime(ms, now = Date.now()) {
    const delta = Math.max(0, now - ms);
    if (delta < MINUTE)
        return "now";
    if (delta < HOUR)
        return `${Math.floor(delta / MINUTE)}m`;
    if (delta < DAY)
        return `${Math.floor(delta / HOUR)}h`;
    if (delta < WEEK)
        return `${Math.floor(delta / DAY)}d`;
    if (delta < 52 * WEEK)
        return `${Math.floor(delta / WEEK)}w`;
    return `${Math.floor(delta / (52 * WEEK))}y`;
}
const SNIPPET_LEAD = 40;
const SNIPPET_LENGTH = 220;
/** A window of the matching line centred on the first matched word. */
function snippet(text, words) {
    let first = -1;
    if (words.length) {
        const lower = text.toLowerCase();
        for (const word of words) {
            const at = lower.indexOf(word);
            if (at !== -1 && (first === -1 || at < first))
                first = at;
        }
    }
    const start = first > SNIPPET_LEAD ? first - SNIPPET_LEAD : 0;
    const end = Math.min(text.length, start + SNIPPET_LENGTH);
    return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}
