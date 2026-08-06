"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAgent = isAgent;
exports.parseQuery = parseQuery;
/**
 * Members are checked against `Agent` by the constructor, so the union stays the
 * single definition of what an agent is; the validator below only consumes it.
 */
const AGENTS = new Set(["claude", "codex"]);
function isAgent(value) {
    return AGENTS.has(value);
}
function parseQuery(raw) {
    const parsed = { words: [], dirs: [] };
    for (const token of raw.split(/\s+/)) {
        if (!token)
            continue;
        const lower = token.toLowerCase();
        if (lower.startsWith("dir:")) {
            const value = lower.slice(4);
            if (value)
                parsed.dirs.push(value);
        }
        else if (lower.startsWith("agent:")) {
            const value = lower.slice(6);
            if (isAgent(value))
                parsed.agent = value;
        }
        else {
            parsed.words.push(lower);
        }
    }
    return parsed;
}
