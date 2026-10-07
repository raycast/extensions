// Quota-only Claude Code statusline bridge. Never saves the incoming session payload.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const [statePath, snapshotPath] = process.argv.slice(2);
function readState() {
  let fd;
  try {
    fd = fs.openSync(statePath, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK | fs.constants.O_NOFOLLOW);
    const info = fs.fstatSync(fd);
    if (!info.isFile() || info.size > 1048576) return;
    const buffer = Buffer.alloc(1048577);
    let length = 0;
    while (length < buffer.length) {
      const count = fs.readSync(fd, buffer, length, buffer.length - length, null);
      if (!count) break;
      length += count;
    }
    if (length > 1048576) return;
    return JSON.parse(buffer.subarray(0, length).toString("utf8"));
  } catch {
    /* Disconnected or unreadable: no quota collection. */
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}
const state = readState();
let original;
if (state?.original?.type === "command" && typeof state.original.command === "string") {
  original = spawn(state.original.command, {
    shell: true,
    stdio: ["pipe", "inherit", "inherit"],
    detached: process.platform !== "win32",
  });
  original.on("error", () => {});
  original.stdin.on("error", () => {});
  process.stdin.pipe(original.stdin);
  const timeout = setTimeout(() => {
    try {
      if (original.pid && process.platform !== "win32") process.kill(-original.pid, "SIGKILL");
      else original.kill("SIGKILL");
    } catch {}
  }, 10000);
  timeout.unref();
  original.on("close", (code) => {
    clearTimeout(timeout);
    process.exitCode = code ?? 0;
  });
}
for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"]) {
  process.on(signal, () => {
    try {
      if (original?.pid && process.platform !== "win32") process.kill(-original.pid, "SIGKILL");
      else original?.kill("SIGKILL");
    } catch {}
    process.exit(0);
  });
}
let chunks = [];
let size = 0;
process.stdin.on("data", (chunk) => {
  size += chunk.length;
  if (size <= 4194304) chunks.push(chunk);
  else chunks = [];
});
process.stdin.on("end", () => {
  original?.stdin.end();
  if (!state || state.active === false || size > 4194304) return;
  try {
    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const limits = {};
    for (const key of ["five_hour", "seven_day"]) {
      const item = payload.rate_limits?.[key];
      if (
        typeof item?.used_percentage !== "number" ||
        !Number.isFinite(item.used_percentage) ||
        item.used_percentage < 0 ||
        item.used_percentage > 100 ||
        typeof item.resets_at !== "number" ||
        !Number.isFinite(item.resets_at)
      )
        continue;
      limits[key] = { used_percentage: item.used_percentage, resets_at: item.resets_at };
    }
    // Stop observations from invocations whose connection has since changed.
    // Readers also check active state, including a disconnect after this check.
    const currentState = readState();
    if (!currentState || currentState.active === false || JSON.stringify(currentState) !== JSON.stringify(state))
      return;
    const snapshot = { updatedAt: new Date().toISOString(), rate_limits: limits };
    const temp = path.join(path.dirname(snapshotPath), `.usage-${crypto.randomUUID()}.tmp`);
    try {
      fs.writeFileSync(temp, JSON.stringify(snapshot), { mode: 0o600, flag: "wx" });
      fs.renameSync(temp, snapshotPath);
    } finally {
      try {
        fs.unlinkSync(temp);
      } catch {}
    }
  } catch {
    /* A statusline must never break Claude's terminal UI. */
  }
});
process.stdin.on("error", () => {
  original?.stdin.end();
});
