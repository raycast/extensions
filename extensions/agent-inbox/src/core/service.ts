import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { run } from "./exec";
import { CLI_PATH, ROOT } from "./paths";

const LABEL = "com.fango.agent-inbox.collector";
const xml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A small local collector watches subscribed transcripts and drains the notification outbox. */
export function collectorPlist(node: string, cli: string, root: string, env: Record<string, string> = {}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>
<key>Label</key><string>${LABEL}</string>
<key>ProgramArguments</key><array>${[node, cli, "watch"].map((arg) => `<string>${xml(arg)}</string>`).join("")}</array>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer>
<key>EnvironmentVariables</key><dict>${Object.entries({ ...env, AGENT_INBOX_HOME: root })
    .map(([key, value]) => `<key>${xml(key)}</key><string>${xml(value)}</string>`)
    .join("")}</dict>
<key>StandardErrorPath</key><string>${xml(join(root, "collector.log"))}</string>
</dict></plist>\n`;
}

export async function installCollector(node: string, cli = CLI_PATH): Promise<void> {
  const directory = join(homedir(), "Library", "LaunchAgents");
  const path = join(directory, `${LABEL}.plist`);
  mkdirSync(directory, { recursive: true });
  mkdirSync(ROOT, { recursive: true });
  const env: Record<string, string> = {};
  for (const key of ["CODEX_HOME", "CLAUDE_CONFIG_DIR", "AGENT_INBOX_CLAUDE_DESKTOP_ROOT"])
    if (process.env[key]) env[key] = process.env[key]!;
  const contents = collectorPlist(node, cli, ROOT, env);
  if (existsSync(path) && readFileSync(path, "utf8") !== contents) {
    writeFileSync(path + ".agent-inbox.bak", readFileSync(path));
    await run("/bin/launchctl", ["bootout", `gui/${process.getuid!()}/${LABEL}`]);
  }
  writeFileSync(path, contents);
  const domain = `gui/${process.getuid!()}`;
  const existing = await run("/bin/launchctl", ["print", `${domain}/${LABEL}`]);
  if (!existing.ok) {
    const started = await run("/bin/launchctl", ["bootstrap", domain, path]);
    if (!started.ok) throw new Error(started.stderr || "Could not start the Agent Inbox collector");
  } else {
    const restarted = await run("/bin/launchctl", ["kickstart", "-k", `${domain}/${LABEL}`]);
    if (!restarted.ok) throw new Error(restarted.stderr || "Could not restart the Agent Inbox collector");
  }
}
