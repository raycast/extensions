import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { environment } from "@raycast/api";
import { binaryPath } from "./hdrctl";

export type Rule = { display: string; hdr: boolean };
export type RulesFile = { version: 1; rules: Rule[] };

type AgentPaths = {
  plistPath: string;
  rulesPath: string;
  logPath: string;
  label: string;
};

const LABEL = "com.hdrtoggle.watch";
const LAUNCHCTL = "/bin/launchctl";

function emptyRules(): RulesFile {
  return { version: 1, rules: [] };
}

export function agentPaths(): AgentPaths {
  const supportPath = environment.supportPath;
  return {
    plistPath: path.join(os.homedir(), "Library", "LaunchAgents", `${LABEL}.plist`),
    rulesPath: path.join(supportPath, "rules.json"),
    logPath: path.join(supportPath, "watcher.log"),
    label: LABEL,
  };
}

function isRule(value: unknown): value is Rule {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.display === "string" && record.display.trim().length > 0 && typeof record.hdr === "boolean";
}

export async function readRules(): Promise<RulesFile> {
  try {
    const raw = await fs.readFile(agentPaths().rulesPath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return emptyRules();

    const record = parsed as Record<string, unknown>;
    if (record.version !== 1 || !Array.isArray(record.rules)) return emptyRules();

    const rules: Rule[] = [];
    for (const entry of record.rules) {
      if (!isRule(entry)) return emptyRules();
      rules.push({ display: entry.display, hdr: entry.hdr });
    }
    return { version: 1, rules };
  } catch {
    // Missing, unreadable or malformed: the watcher treats this as "no rules".
    return emptyRules();
  }
}

async function writeFileAtomic(filePath: string, contents: string): Promise<void> {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });
  const tempPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`,
  );
  try {
    await fs.writeFile(tempPath, contents, "utf8");
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

export async function writeRules(rules: Rule[]): Promise<void> {
  const payload: RulesFile = {
    version: 1,
    rules: rules.map((rule) => ({ display: rule.display, hdr: rule.hdr })),
  };
  await writeFileAtomic(agentPaths().rulesPath, `${JSON.stringify(payload, null, 2)}\n`);
}

export async function isAgentInstalled(): Promise<boolean> {
  try {
    await fs.access(agentPaths().plistPath);
    return true;
  } catch {
    return false;
  }
}

function currentUid(): number {
  const getuid = process.getuid;
  if (typeof getuid !== "function") {
    throw new Error("launchd is only available on macOS.");
  }
  return getuid();
}

function describeError(error: unknown): string {
  if (typeof error === "object" && error !== null && "stderr" in error) {
    const stderr = (error as { stderr?: unknown }).stderr;
    if (typeof stderr === "string" && stderr.trim().length > 0) {
      return stderr.trim().split("\n")[0];
    }
  }
  return error instanceof Error ? error.message : String(error);
}

function launchctl(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(LAUNCHCTL, args, { timeout: 15_000 }, (error, _stdout, stderr) => {
      if (error) {
        const detail = typeof stderr === "string" && stderr.trim().length > 0 ? stderr.trim() : error.message;
        reject(new Error(detail));
        return;
      }
      resolve();
    });
  });
}

async function bootout(): Promise<void> {
  const paths = agentPaths();
  try {
    await launchctl(["bootout", `gui/${currentUid()}`, paths.plistPath]);
  } catch {
    // Not loaded, stale, or never installed. Nothing to stop.
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function plistXml(executable: string, paths: AgentPaths): string {
  const programArguments = [executable, "watch", "--rules", paths.rulesPath]
    .map((argument) => `      <string>${escapeXml(argument)}</string>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${escapeXml(paths.label)}</string>
    <key>ProgramArguments</key>
    <array>
${programArguments}
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ThrottleInterval</key>
    <integer>10</integer>
    <key>ProcessType</key>
    <string>Background</string>
    <key>StandardOutPath</key>
    <string>${escapeXml(paths.logPath)}</string>
    <key>StandardErrorPath</key>
    <string>${escapeXml(paths.logPath)}</string>
  </dict>
</plist>
`;
}

export async function installAgent(executable: string): Promise<void> {
  const paths = agentPaths();
  const plist = plistXml(executable, paths);

  // The contract's install order: stop any running copy, write the plist, start it again.
  await bootout();
  await writeFileAtomic(paths.plistPath, plist);

  try {
    await launchctl(["bootstrap", `gui/${currentUid()}`, paths.plistPath]);
  } catch (error) {
    throw new Error(
      `Could not start the watcher: ${describeError(error)}. Try removing the watcher and adding the rule again.`,
    );
  }
}

export async function uninstallAgent(): Promise<void> {
  const paths = agentPaths();
  await bootout();

  try {
    await fs.unlink(paths.plistPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }
}

export async function syncAgent(): Promise<boolean> {
  const { rules } = await readRules();

  if (rules.length === 0) {
    await uninstallAgent();
    return false;
  }

  const executable = await binaryPath();
  await installAgent(executable);
  return true;
}
