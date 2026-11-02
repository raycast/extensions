import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  BRIDGE_COMMAND,
  buildBridgeScript,
  isBridgeCommand,
  isBridgeConnected,
  previousStatusLine,
  withBridge,
  withoutBridge,
} from "../src/lib/bridge";

const home = mkdtempSync(join(tmpdir(), "usage-ring-home-"));
mkdirSync(join(home, ".claude"));
afterAll(() => rmSync(home, { recursive: true, force: true }));

const PAYLOAD = JSON.stringify({
  cwd: "/secret/project",
  session_id: "abc",
  rate_limits: { five_hour: { used_percentage: 12, resets_at: 1738425600 } },
});

function run(script: string, input: string): string {
  const file = join(home, "bridge.sh");
  writeFileSync(file, script, { mode: 0o755 });
  return execFileSync("/bin/sh", [file], { input, env: { HOME: home, PATH: "/usr/bin:/bin" } }).toString();
}

const dataFile = () => join(home, ".claude", "usage-ring.json");

describe("bridge script", () => {
  it("writes only rate_limits and prints nothing without a previous status line", () => {
    expect(run(buildBridgeScript(), PAYLOAD)).toBe("");
    const saved = JSON.parse(readFileSync(dataFile(), "utf8"));
    expect(saved).toEqual({ five_hour: { used_percentage: 12, resets_at: 1738425600 } });
    expect(readFileSync(dataFile(), "utf8")).not.toContain("secret");
  });

  it("keeps the last good file when rate_limits is absent", () => {
    run(buildBridgeScript(), JSON.stringify({ cwd: "/x" }));
    expect(JSON.parse(readFileSync(dataFile(), "utf8")).five_hour.used_percentage).toBe(12);
    expect(execFileSync("/bin/ls", [join(home, ".claude")]).toString()).not.toContain(".tmp");
  });

  it("writes to a custom data file when one is given", () => {
    const custom = join(home, "custom dir's", "usage-ring.json");
    mkdirSync(join(home, "custom dir's"));
    run(buildBridgeScript(null, custom), PAYLOAD);
    expect(JSON.parse(readFileSync(custom, "utf8")).five_hour.used_percentage).toBe(12);
  });

  it("passes the full payload to a previous status line command, quotes included", () => {
    const out = run(buildBridgeScript(`cat > /dev/null; echo "it's model: ok"`), PAYLOAD);
    expect(out.trim()).toBe("it's model: ok");
    const echo = run(buildBridgeScript("/usr/bin/plutil -extract session_id raw -o - -"), PAYLOAD);
    expect(echo.trim()).toBe("abc");
  });
});

describe("settings transforms", () => {
  it("installs over nothing and removes cleanly", () => {
    const { settings, previous } = withBridge({ theme: "dark" });
    expect(previous).toBeNull();
    expect(settings).toEqual({ theme: "dark", statusLine: { type: "command", command: BRIDGE_COMMAND } });
    expect(withoutBridge(settings, previous)).toEqual({ theme: "dark" });
  });

  it("keeps an existing status line's options and restores it exactly", () => {
    const original = { type: "command", command: "~/my-line.sh", padding: 2, refreshInterval: 5 };
    const { settings, previous } = withBridge({ statusLine: original });
    expect(previous).toEqual(original);
    expect(settings.statusLine).toEqual({ ...original, command: BRIDGE_COMMAND });
    expect(withoutBridge(settings, previous)).toEqual({ statusLine: original });
  });

  it("re-installing does not capture itself as the previous line", () => {
    const once = withBridge({}).settings;
    expect(withBridge(once).previous).toBeNull();
  });

  it("leaves a status line the user changed since alone", () => {
    const changed = { statusLine: { type: "command", command: "~/other.sh" } };
    expect(withoutBridge(changed, null)).toEqual(changed);
  });

  it("recognises the bridge command", () => {
    expect(isBridgeCommand(BRIDGE_COMMAND)).toBe(true);
    expect(isBridgeCommand("~/x.sh")).toBe(false);
    expect(isBridgeCommand(undefined)).toBe(false);
    expect(existsSync(home)).toBe(true);
  });
});

describe("isBridgeConnected", () => {
  const dir = mkdtempSync(join(tmpdir(), "usage-ring-connected-"));
  const settings = join(dir, "settings.json");
  const script = join(dir, "usage-ring-statusline.sh");
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("needs both the script and the status line command", async () => {
    expect(await isBridgeConnected(settings, script)).toBe(false);
    writeFileSync(script, "#!/bin/sh\n");
    expect(await isBridgeConnected(settings, script)).toBe(false);
    writeFileSync(settings, JSON.stringify({ statusLine: { type: "command", command: BRIDGE_COMMAND } }));
    expect(await isBridgeConnected(settings, script)).toBe(true);
  });

  it("is false when the user replaced the status line", async () => {
    writeFileSync(settings, JSON.stringify({ statusLine: { type: "command", command: "other.sh" } }));
    expect(await isBridgeConnected(settings, script)).toBe(false);
  });

  it("is false when settings.json is broken", async () => {
    writeFileSync(settings, "{");
    expect(await isBridgeConnected(settings, script)).toBe(false);
  });
});

describe("previous status line on disconnect", () => {
  const dir = mkdtempSync(join(tmpdir(), "usage-ring-prev-"));
  const state = join(dir, "usage-ring-bridge.json");
  const backup = join(dir, "settings.json.usage-ring.bak");
  const mine = { type: "command", command: "~/my-line.sh" };
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("comes from the saved state", async () => {
    writeFileSync(state, JSON.stringify({ previousStatusLine: mine }));
    expect(await previousStatusLine(state, backup)).toEqual(mine);
  });

  it("falls back to the settings backup when the state file is missing", async () => {
    rmSync(state);
    writeFileSync(backup, JSON.stringify({ statusLine: mine }));
    expect(await previousStatusLine(state, backup)).toEqual(mine);
    writeFileSync(backup, JSON.stringify({ statusLine: { command: BRIDGE_COMMAND } }));
    expect(await previousStatusLine(state, backup)).toBeNull();
  });

  it("throws instead of guessing when the state file can't be read", async () => {
    writeFileSync(state, JSON.stringify({ previousStatusLine: mine }));
    chmodSync(state, 0o000);
    await expect(previousStatusLine(state, backup)).rejects.toThrow(/Can't read/);
    chmodSync(state, 0o644);
    writeFileSync(state, "{");
    await expect(previousStatusLine(state, backup)).rejects.toThrow(/not valid JSON/);
  });
});
