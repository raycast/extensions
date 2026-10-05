import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import yaml from "js-yaml";
import { applyPaperDirOverride } from "./config-utils";

type YamlObject = Record<string, unknown>;

interface Prefs {
  // common string prefs
  pythonPath?: string;
  paperDir?: string;
  configPath?: string;
  maxPapersPerDay?: string;
  lookbackDays?: string;
  keyphrases?: string;
  allowCategories?: string;
  denyCategories?: string;
  excludeKeywords?: string;
  summarizeProvider?: string;
  summarizeModel?: string;
  summarizeLanguage?: string;
  openaiApiKey?: string;

  // boolean prefs
  summarizeEnabled?: boolean;
  scholarEnabled?: boolean;

  // scholar / email prefs
  scholarProvider?: string;
  scholarImapHost?: string;
  scholarImapUser?: string;
  scholarImapPasswordEnv?: string;
  scholarGmailLabel?: string;
  scholarFromAddresses?: string;
  scholarImapPassword?: string;

  // any other arbitrary preference keys
  [key: string]: string | boolean | undefined;
}

export const DAILY_SCHEDULE_HOUR = 4;
export const DAILY_SCHEDULE_LABEL = "com.paperagent.daily";
const ENV_VAR_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export type RunResult = {
  success: boolean;
  stderr?: string;
  stdout?: string;
  /** True when the process was started detached (run continues after extension unloads). */
  detached?: boolean;
};

export type PreparedRun = {
  agentRoot: string;
  pythonBin: string;
  configPath: string;
  cleanup: () => void;
};

export type SchedulePaths = {
  supportDir: string;
  launchdDir: string;
  stateDir: string;
  logDir: string;
  envFilePath: string;
  mergedConfigPath: string;
  plistPath: string;
  stdoutPath: string;
  stderrPath: string;
  lastSuccessPath: string;
  statusPath: string;
};

export function getAgentRoot(configPath: string): string {
  return configPath.trim().length > 0 ? path.dirname(configPath.trim()) : "";
}

export function getPythonBin(prefs: Prefs, agentRoot: string): string {
  return prefs.pythonPath && prefs.pythonPath.trim().length > 0
    ? prefs.pythonPath.trim()
    : path.join(agentRoot, ".venv", "bin", "python3");
}

export function parseList(value: string | undefined): string[] {
  if (!value || !value.trim()) return [];
  return value
    .split(/[\n,，;；]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseRequiredPositiveInt(
  value: string | undefined,
  fieldName: string,
): { ok: true; value: number } | { ok: false; message: string } {
  const raw = value?.trim() ?? "";
  if (!raw) {
    return { ok: false, message: `${fieldName} is required in extension Preferences.` };
  }
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1) {
    return { ok: false, message: `${fieldName} must be a positive integer.` };
  }
  return { ok: true, value: n };
}

export function stripAllWhitespace(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, "");
}

export function isValidEnvVarName(name: string): boolean {
  return ENV_VAR_NAME_RE.test(name);
}

export function assertValidEnvVarName(name: string, fieldName: string): void {
  if (!isValidEnvVarName(name)) {
    throw new Error(`${fieldName} must match [A-Za-z_][A-Za-z0-9_]*.`);
  }
}

export function parseProcessedCount(stdout: string): number | undefined {
  const m = stdout.match(/Processed\s+(\d+)\s+new\s+paper/i);
  return m ? parseInt(m[1], 10) : undefined;
}

export function getSchedulePaths(): SchedulePaths {
  const supportDir = path.join(os.homedir(), "Library", "Application Support", "PaperAgent");
  const launchdDir = path.join(supportDir, "launchd");
  const stateDir = path.join(supportDir, "state");
  const logDir = path.join(os.homedir(), "Library", "Logs", "PaperAgent");
  return {
    supportDir,
    launchdDir,
    stateDir,
    logDir,
    envFilePath: path.join(launchdDir, "daily.env"),
    mergedConfigPath: path.join(launchdDir, "daily-config.yaml"),
    plistPath: path.join(os.homedir(), "Library", "LaunchAgents", `${DAILY_SCHEDULE_LABEL}.plist`),
    stdoutPath: path.join(logDir, "launchd.stdout.log"),
    stderrPath: path.join(logDir, "launchd.stderr.log"),
    lastSuccessPath: path.join(stateDir, "last_success_date"),
    statusPath: path.join(stateDir, "last_run_status.json"),
  };
}

export function getActiveRunLockPid(stateDir: string): number | undefined {
  const pidPath = path.join(stateDir, "run.lock", "pid");
  let raw: string;
  try {
    raw = fs.readFileSync(pidPath, "utf-8").trim();
  } catch {
    return undefined;
  }
  if (!/^[0-9]+$/.test(raw)) {
    return undefined;
  }

  const pid = Number(raw);
  if (!Number.isSafeInteger(pid) || pid < 1) {
    return undefined;
  }

  const ps = spawnSync("/bin/ps", ["-o", "state=", "-o", "command=", "-p", String(pid)], {
    encoding: "utf-8",
  });
  if (ps.error || ps.status !== 0 || typeof ps.stdout !== "string") {
    return undefined;
  }

  const line = ps.stdout.trim();
  if (!line) {
    return undefined;
  }

  const match = line.match(/^(\S+)\s+(.*)$/);
  if (!match) {
    return undefined;
  }

  const state = match[1];
  const command = match[2];
  if (state.startsWith("Z")) {
    return undefined;
  }
  if (!command.includes("run_paper_agent.sh")) {
    return undefined;
  }
  return pid;
}

function loadBaseConfig(configPath: string): YamlObject {
  const raw = fs.readFileSync(configPath, "utf-8");
  const loaded = yaml.load(raw);
  if (loaded == null || typeof loaded !== "object" || Array.isArray(loaded)) {
    throw new Error("Config must be a YAML object, not a string or array.");
  }
  return loaded as YamlObject;
}

function mergeConfig(base: YamlObject, prefs: Prefs): YamlObject {
  const merged = applyPaperDirOverride(base, prefs.paperDir?.trim() ?? "");

  if (!merged.direction || typeof merged.direction !== "object") {
    merged.direction = {};
  }
  const direction = merged.direction as YamlObject;
  const maxPapers = parseInt(prefs.maxPapersPerDay?.trim() ?? "", 10);
  const lookback = parseInt(prefs.lookbackDays?.trim() ?? "", 10);
  direction.max_papers_per_day = Number.isNaN(maxPapers) || maxPapers < 1 ? 12 : maxPapers;
  direction.lookback_days = Number.isNaN(lookback) || lookback < 1 ? 5 : lookback;
  direction.include_keywords = parseList(prefs.keyphrases);
  direction.allow_categories = parseList(prefs.allowCategories);
  direction.deny_categories = parseList(prefs.denyCategories);
  direction.exclude_keywords = parseList(prefs.excludeKeywords);

  if (!merged.summarize || typeof merged.summarize !== "object") {
    merged.summarize = {};
  }
  const summarize = merged.summarize as YamlObject;
  summarize.enabled = prefs.summarizeEnabled;
  summarize.provider = prefs.summarizeEnabled ? (prefs.summarizeProvider?.trim() ?? "") : "openai";
  summarize.model = prefs.summarizeEnabled ? (prefs.summarizeModel?.trim() ?? "") : "gpt-4o-mini";
  summarize.language = prefs.summarizeLanguage;

  if (!merged.sources || typeof merged.sources !== "object") {
    merged.sources = {};
  }
  const sources = merged.sources as YamlObject;

  if (!sources.arxiv || typeof sources.arxiv !== "object") {
    sources.arxiv = {};
  }
  (sources.arxiv as YamlObject).enabled = true;

  if (!sources.scholar_alerts || typeof sources.scholar_alerts !== "object") {
    sources.scholar_alerts = {};
  }
  const scholar = sources.scholar_alerts as YamlObject;
  scholar.enabled = prefs.scholarEnabled;
  scholar.mode = "email";
  if (!scholar.light_filter || typeof scholar.light_filter !== "object") {
    scholar.light_filter = { include_keywords: [], exclude_keywords: [] };
  }
  if (!scholar.email || typeof scholar.email !== "object") {
    scholar.email = {};
  }
  const email = scholar.email as YamlObject;
  const provider = (prefs.scholarProvider?.trim() ?? "").toLowerCase();
  email.provider = provider || "imap";
  email.imap_host = prefs.scholarImapHost?.trim() ?? "";
  email.imap_user = prefs.scholarImapUser?.trim() ?? "";
  email.imap_password_env = prefs.scholarImapPasswordEnv?.trim() ?? "";
  email.gmail_label = prefs.scholarGmailLabel?.trim() ?? "";
  const fromAddrs = prefs.scholarFromAddresses?.trim();
  email.from_addresses = fromAddrs ? parseList(fromAddrs) : [];
  email.mbox_path = "";
  email.eml_dir = "";

  if (!merged.policy || typeof merged.policy !== "object") {
    merged.policy = {};
  }
  (merged.policy as YamlObject).type = prefs.policyType ?? "off";

  return merged;
}

export function buildRunEnv(prefs: Prefs): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const openaiKey = prefs.openaiApiKey?.trim();
  if (openaiKey) {
    env.OPENAI_API_KEY = openaiKey;
  }

  const provider = (prefs.scholarProvider?.trim() ?? "").toLowerCase();
  if (prefs.scholarEnabled && provider === "imap") {
    const imapEnvName = prefs.scholarImapPasswordEnv?.trim() || "IMAP_PASSWORD";
    assertValidEnvVarName(imapEnvName, "Scholar IMAP password env var");
    const imapPassword = stripAllWhitespace(prefs.scholarImapPassword);
    if (imapPassword) {
      env[imapEnvName] = imapPassword;
    }
  }
  return env;
}

export function buildScheduleSecrets(prefs: Prefs): Record<string, string> {
  const env: Record<string, string> = {};
  const openaiKey = prefs.openaiApiKey?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    env.OPENAI_API_KEY = openaiKey;
  }

  const provider = (prefs.scholarProvider?.trim() ?? "").toLowerCase();
  if (prefs.scholarEnabled && provider === "imap") {
    const imapEnvName = prefs.scholarImapPasswordEnv?.trim() || "IMAP_PASSWORD";
    assertValidEnvVarName(imapEnvName, "Scholar IMAP password env var");
    const imapPassword = stripAllWhitespace(prefs.scholarImapPassword) || process.env[imapEnvName]?.trim() || "";
    if (imapPassword) {
      env[imapEnvName] = imapPassword;
    }
  }
  return env;
}

export function prepareRun(prefs: Prefs, options?: { persistConfigPath?: string }): PreparedRun {
  const configPath = prefs.configPath?.trim() ?? "";
  if (!configPath) {
    throw new Error("Set Config file path in extension Preferences.");
  }
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config not found: ${configPath}`);
  }

  const agentRoot = getAgentRoot(configPath);
  const base = loadBaseConfig(configPath);

  if (!(prefs.paperDir?.trim() ?? "")) {
    throw new Error("Set 'Paper directory' in extension Preferences for Run Paper Agent.");
  }

  const maxPapersParsed = parseRequiredPositiveInt(prefs.maxPapersPerDay, "Max papers per day");
  if (!maxPapersParsed.ok) {
    throw new Error(maxPapersParsed.message);
  }

  const lookbackParsed = parseRequiredPositiveInt(prefs.lookbackDays, "Lookback days");
  if (!lookbackParsed.ok) {
    throw new Error(lookbackParsed.message);
  }

  if (prefs.summarizeEnabled) {
    if (!(prefs.summarizeProvider?.trim() ?? "")) {
      throw new Error("Summary provider is required when LLM summary is enabled.");
    }
    if (!(prefs.summarizeModel?.trim() ?? "")) {
      throw new Error("Summary model is required when LLM summary is enabled.");
    }
  }

  if (prefs.scholarEnabled) {
    const provider = (prefs.scholarProvider?.trim() ?? "").toLowerCase();
    if (!provider) {
      throw new Error("Scholar email provider is required when Scholar Inbox is enabled.");
    }
    if (!["imap", "gmail", "mbox", "eml_dir"].includes(provider)) {
      throw new Error("Scholar email provider must be one of: imap, gmail, mbox, eml_dir.");
    }
    if (provider === "mbox" || provider === "eml_dir") {
      throw new Error(`Scholar provider '${provider}' requires local paths not exposed in Raycast Preferences.`);
    }
    if (provider === "imap") {
      if (!(prefs.scholarImapHost?.trim() ?? "")) {
        throw new Error("Scholar IMAP host is required when Scholar provider is IMAP.");
      }
      if (!(prefs.scholarImapUser?.trim() ?? "")) {
        throw new Error("Scholar IMAP user is required when Scholar provider is IMAP.");
      }
      if (!(prefs.scholarImapPasswordEnv?.trim() ?? "")) {
        throw new Error("Scholar IMAP password env var is required when Scholar provider is IMAP.");
      }
      const imapEnvName = prefs.scholarImapPasswordEnv?.trim() || "IMAP_PASSWORD";
      assertValidEnvVarName(imapEnvName, "Scholar IMAP password env var");
      const hasImapPassword = !!(stripAllWhitespace(prefs.scholarImapPassword) || process.env[imapEnvName]);
      if (!hasImapPassword) {
        throw new Error(
          "Set 'Scholar IMAP password' in Preferences or set the env var (e.g. IMAP_PASSWORD) so Raycast can pass it to the pipeline.",
        );
      }
    }
  }

  const merged = mergeConfig(base, prefs);
  const targetConfigPath =
    options?.persistConfigPath ??
    path.join(os.tmpdir(), `paper-agent-run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.yaml`);
  fs.mkdirSync(path.dirname(targetConfigPath), { recursive: true });
  fs.writeFileSync(targetConfigPath, yaml.dump(merged), "utf-8");

  const cleanup = () => {
    if (!options?.persistConfigPath && fs.existsSync(targetConfigPath)) {
      try {
        fs.unlinkSync(targetConfigPath);
      } catch {
        // ignore cleanup errors
      }
    }
  };

  return {
    agentRoot,
    pythonBin: getPythonBin(prefs, agentRoot),
    configPath: targetConfigPath,
    cleanup,
  };
}

export function runViaRunner(options: {
  agentRoot: string;
  pythonBin: string;
  configPath: string;
  env: NodeJS.ProcessEnv;
  mode: "manual" | "daily-launchd";
  runHour?: number;
  stateDir?: string;
  logDir?: string;
  envFilePath?: string;
  /** If true, spawn detached so the run continues after the extension unloads; stdout/stderr are not captured. */
  detach?: boolean;
}): Promise<RunResult> {
  return new Promise((resolve) => {
    let stderr = "";
    let stdout = "";
    const runnerPath = path.join(options.agentRoot, "scripts", "run_paper_agent.sh");
    const args = [
      runnerPath,
      "--mode",
      options.mode,
      "--agent-root",
      options.agentRoot,
      "--python",
      options.pythonBin,
      "--config",
      options.configPath,
    ];

    if (options.runHour !== undefined) {
      args.push("--run-hour", String(options.runHour));
    }
    if (options.stateDir) {
      args.push("--state-dir", options.stateDir);
    }
    if (options.logDir) {
      args.push("--log-dir", options.logDir);
    }
    if (options.envFilePath) {
      args.push("--env-file", options.envFilePath);
    }

    if (options.detach) {
      let settled = false;
      const settle = (result: RunResult) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      try {
        const proc = spawn("/bin/zsh", args, {
          cwd: options.agentRoot,
          env: options.env,
          detached: true,
          stdio: "ignore",
        });
        proc.once("error", () => {
          settle({ success: false, stderr: "Failed to start process" });
        });
        proc.once("spawn", () => {
          proc.unref();
          settle({ success: true, detached: true });
        });
      } catch {
        settle({ success: false, stderr: "Failed to start process" });
      }
      return;
    }

    const proc = spawn("/bin/zsh", args, {
      cwd: options.agentRoot,
      env: options.env,
    });

    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("close", (code) => {
      resolve({
        success: code === 0,
        stderr: stderr.trim() || undefined,
        stdout: stdout.trim() || undefined,
      });
    });
    proc.on("error", () => {
      resolve({ success: false, stderr: "Failed to start process" });
    });
  });
}
