"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORCA_BIN = exports.RG_BIN = exports.SPAWN_ENV = exports.CODEX_ROOT = exports.CLAUDE_ROOT = exports.MANIFEST_PATH = exports.CORPUS_PATH = exports.CACHE_DIR = void 0;
exports.expandTilde = expandTilde;
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
exports.CACHE_DIR = (0, node_path_1.join)((0, node_os_1.homedir)(), ".cache", "search-agent-sessions");
exports.CORPUS_PATH = (0, node_path_1.join)(exports.CACHE_DIR, "corpus.txt");
exports.MANIFEST_PATH = (0, node_path_1.join)(exports.CACHE_DIR, "sessions.json");
exports.CLAUDE_ROOT = (0, node_path_1.join)((0, node_os_1.homedir)(), ".claude", "projects");
exports.CODEX_ROOT = (0, node_path_1.join)((0, node_os_1.homedir)(), ".codex", "sessions");
/**
 * Where a user-installed CLI plausibly lives: package managers, version-manager
 * shims, and hand-rolled installs. Used both to probe for a binary and to widen
 * the PATH our subprocesses inherit.
 */
const BIN_DIRS = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/opt/local/bin", // MacPorts
    (0, node_path_1.join)((0, node_os_1.homedir)(), ".local", "bin"),
    (0, node_path_1.join)((0, node_os_1.homedir)(), ".cargo", "bin"),
    (0, node_path_1.join)((0, node_os_1.homedir)(), ".local", "share", "mise", "shims"),
    (0, node_path_1.join)((0, node_os_1.homedir)(), ".asdf", "shims"),
    (0, node_path_1.join)((0, node_os_1.homedir)(), ".volta", "bin"),
];
/**
 * Raycast spawns the extension with a login-shell-free PATH, so bare `rg`/`orca`
 * frequently fail to resolve. Probe `preferred` (install locations we expect, in
 * priority order) and then every known bin dir; falling back to the bare name is
 * still worth it because subprocesses run with {@link SPAWN_ENV}, whose PATH
 * covers installs we never guessed.
 */
function resolveBin(name, preferred) {
    for (const c of preferred)
        if ((0, node_fs_1.existsSync)(c))
            return c;
    for (const dir of BIN_DIRS) {
        const candidate = (0, node_path_1.join)(dir, name);
        if ((0, node_fs_1.existsSync)(candidate))
            return candidate;
    }
    return name;
}
/**
 * Environment for every subprocess we launch. The inherited PATH stays in front
 * so a working entry always wins; our directories only extend the search.
 */
exports.SPAWN_ENV = {
    ...process.env,
    PATH: [process.env.PATH, ...BIN_DIRS].filter(Boolean).join(":"),
};
exports.RG_BIN = resolveBin("rg", [
    "/opt/homebrew/bin/rg",
    "/usr/local/bin/rg",
    "/usr/bin/rg",
]);
exports.ORCA_BIN = resolveBin("orca", [
    "/usr/local/bin/orca",
    "/opt/homebrew/bin/orca",
]);
function expandTilde(p) {
    if (p === "~")
        return (0, node_os_1.homedir)();
    if (p.startsWith("~/"))
        return (0, node_path_1.join)((0, node_os_1.homedir)(), p.slice(2));
    return p;
}
