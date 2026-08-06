"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIgnoreList = parseIgnoreList;
exports.makeFilter = makeFilter;
const node_path_1 = require("node:path");
const paths_1 = require("./paths");
function parseIgnoreList(raw) {
    return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}
function makeFilter(query, config) {
    // A root typed with a trailing slash must still match a cwd equal to it.
    // Stripping every trailing separator also turns a bare "/" into "", which
    // correctly disables the root filter entirely.
    let root = (0, paths_1.expandTilde)(config.searchRoot.trim());
    while (root.endsWith(node_path_1.sep))
        root = root.slice(0, -1);
    const rootPrefix = root + node_path_1.sep;
    const ignore = new Set(config.ignore);
    const agent = query.agent ?? config.agentOverride;
    return (session) => {
        if (!session.cwd)
            return false;
        if (agent && session.agent !== agent)
            return false;
        if (!config.includeOutsideRoot &&
            root &&
            session.cwd !== root &&
            !session.cwd.startsWith(rootPrefix))
            return false;
        if (ignore.size &&
            session.cwd.split(node_path_1.sep).some((segment) => ignore.has(segment)))
            return false;
        if (query.dirs.length) {
            const cwd = session.cwd.toLowerCase();
            if (!query.dirs.every((d) => cwd.includes(d)))
                return false;
        }
        return true;
    };
}
