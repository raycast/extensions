import { environment, getPreferenceValues } from "@raycast/api";
import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

type JsonObject = Record<string, unknown>;

type HookFileSet = {
  eventBridge: string;
  askBridge: string;
  notifyBridge?: string;
  afterAgentBridge?: string;
};

export type HookProviderStatus = {
  provider: "claude" | "gemini";
  settingsPath: string;
  configured: boolean;
  bridgePaths: HookFileSet;
};

export type HookSetupStatus = {
  notifierRoot: string;
  runtimeDir: string;
  runtimeInstalled: boolean;
  claude: HookProviderStatus;
  gemini: HookProviderStatus;
};

export async function loadHookSetupStatus(): Promise<HookSetupStatus> {
  const notifierRoot = notifierRootPath();
  const runtimeDir = hookRuntimeInstallDir(notifierRoot);
  const claude = await loadClaudeStatus(runtimeDir);
  const gemini = await loadGeminiStatus(runtimeDir);

  return {
    notifierRoot,
    runtimeDir,
    runtimeInstalled: await pathExists(join(runtimeDir, "hooks")),
    claude,
    gemini,
  };
}

export async function installClaudeHooks(): Promise<HookProviderStatus> {
  const notifierRoot = notifierRootPath();
  const runtimeDir = await ensureHookRuntimeInstalled(notifierRoot);
  const settingsPath = claudeSettingsPath();
  await backupSettingsFile(settingsPath);
  await mergeSettings(settingsPath, buildClaudeSettings(runtimeDir));
  return loadClaudeStatus(runtimeDir);
}

export async function installGeminiHooks(): Promise<HookProviderStatus> {
  const notifierRoot = notifierRootPath();
  const runtimeDir = await ensureHookRuntimeInstalled(notifierRoot);
  const settingsPath = geminiSettingsPath();
  await backupSettingsFile(settingsPath);
  await mergeSettings(settingsPath, buildGeminiSettings(runtimeDir));
  return loadGeminiStatus(runtimeDir);
}

export async function installAllHooks(): Promise<HookSetupStatus> {
  await installClaudeHooks();
  await installGeminiHooks();
  return loadHookSetupStatus();
}

export function claudeSettingsPath() {
  return join(homedir(), ".claude", "settings.json");
}

export function geminiSettingsPath() {
  return join(homedir(), ".gemini", "settings.json");
}

export async function ensureSettingsFile(settingsPath: string) {
  await fs.mkdir(dirname(settingsPath), { recursive: true });
  if (!(await pathExists(settingsPath))) {
    await fs.writeFile(settingsPath, "{}\n");
  }
}

function hookRuntimeInstallDir(notifierRoot: string) {
  return join(notifierRoot, "generated-hooks");
}

function notifierRootPath() {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.notifierRootPath.replace(/^~(?=\/)/, homedir());
}

function hookRuntimeAssetDir() {
  return join(environment.assetsPath, "hook-runtime");
}

async function ensureHookRuntimeInstalled(notifierRoot: string) {
  const runtimeDir = hookRuntimeInstallDir(notifierRoot);
  const sourceDir = hookRuntimeAssetDir();
  await fs.mkdir(dirname(runtimeDir), { recursive: true });
  await fs.cp(sourceDir, runtimeDir, {
    recursive: true,
    force: true,
  });
  return runtimeDir;
}

async function loadClaudeStatus(
  runtimeDir: string,
): Promise<HookProviderStatus> {
  const settingsPath = claudeSettingsPath();
  const bridgePaths = {
    eventBridge: join(runtimeDir, "hooks", "claude-event-bridge.mjs"),
    askBridge: join(runtimeDir, "hooks", "claude-ask-user-question-bridge.mjs"),
  };
  const settings = await readSettings(settingsPath);

  return {
    provider: "claude",
    settingsPath,
    configured:
      includesCommand(settings, bridgePaths.eventBridge) &&
      includesCommand(settings, bridgePaths.askBridge),
    bridgePaths,
  };
}

async function loadGeminiStatus(
  runtimeDir: string,
): Promise<HookProviderStatus> {
  const settingsPath = geminiSettingsPath();
  const bridgePaths = {
    eventBridge: join(runtimeDir, "hooks", "gemini-notification-bridge.mjs"),
    askBridge: join(runtimeDir, "hooks", "gemini-ask-user-bridge.mjs"),
    afterAgentBridge: join(
      runtimeDir,
      "hooks",
      "gemini-after-agent-bridge.mjs",
    ),
  };
  const settings = await readSettings(settingsPath);

  return {
    provider: "gemini",
    settingsPath,
    configured:
      includesCommand(settings, bridgePaths.eventBridge) &&
      includesCommand(settings, bridgePaths.askBridge) &&
      includesCommand(settings, bridgePaths.afterAgentBridge),
    bridgePaths,
  };
}

async function readSettings(settingsPath: string): Promise<JsonObject> {
  try {
    const raw = await fs.readFile(settingsPath, "utf8");
    return JSON.parse(raw) as JsonObject;
  } catch {
    return {};
  }
}

async function backupSettingsFile(settingsPath: string) {
  if (!(await pathExists(settingsPath))) {
    return;
  }

  const backupDir = join(dirname(settingsPath), "backups");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await fs.mkdir(backupDir, { recursive: true });
  await fs.copyFile(
    settingsPath,
    join(backupDir, `settings.json.${timestamp}`),
  );
}

async function mergeSettings(settingsPath: string, template: JsonObject) {
  await ensureSettingsFile(settingsPath);
  const current = await readSettings(settingsPath);

  const merged = {
    ...current,
    ...template,
    hooks: {
      ...((current.hooks as JsonObject | undefined) ?? {}),
      ...((template.hooks as JsonObject | undefined) ?? {}),
    },
  };

  await fs.writeFile(settingsPath, `${JSON.stringify(merged, null, 2)}\n`);
}

function buildClaudeSettings(runtimeDir: string) {
  const eventBridge = shellEscape(
    join(runtimeDir, "hooks", "claude-event-bridge.mjs"),
  );
  const askBridge = shellEscape(
    join(runtimeDir, "hooks", "claude-ask-user-question-bridge.mjs"),
  );

  return {
    hooks: {
      Stop: [
        {
          matcher: "",
          hooks: [
            {
              type: "command",
              command: `node ${eventBridge} 2>/dev/null || true`,
            },
          ],
        },
      ],
      Elicitation: [
        {
          matcher: "",
          hooks: [
            {
              type: "command",
              command: `node ${eventBridge} 2>/dev/null || true`,
            },
          ],
        },
      ],
      PreToolUse: [
        {
          matcher: "AskUserQuestion",
          hooks: [
            {
              type: "command",
              command: `node ${askBridge} 2>/dev/null || true`,
            },
          ],
        },
      ],
    },
  };
}

function buildGeminiSettings(runtimeDir: string) {
  const askBridge = shellEscape(
    join(runtimeDir, "hooks", "gemini-ask-user-bridge.mjs"),
  );
  const notificationBridge = shellEscape(
    join(runtimeDir, "hooks", "gemini-notification-bridge.mjs"),
  );
  const afterAgentBridge = shellEscape(
    join(runtimeDir, "hooks", "gemini-after-agent-bridge.mjs"),
  );

  return {
    hooks: {
      BeforeTool: [
        {
          matcher: "ask_user",
          hooks: [
            {
              name: "ai-notifier-gemini-ask-user",
              type: "command",
              command: `node ${askBridge}`,
              timeout: 300000,
              description:
                "Route Gemini ask_user prompts through Raycast and feed the response back through hooks.",
            },
          ],
        },
      ],
      Notification: [
        {
          matcher: "*",
          hooks: [
            {
              name: "ai-notifier-needs-input",
              type: "command",
              command: `node ${notificationBridge}`,
              timeout: 5000,
              description:
                "Forward Gemini notifications to Raycast as needs_input alerts.",
            },
          ],
        },
      ],
      AfterAgent: [
        {
          matcher: "*",
          hooks: [
            {
              name: "ai-notifier-done",
              type: "command",
              command: `node ${afterAgentBridge}`,
              timeout: 5000,
              description:
                "Forward Gemini completed turns to Raycast as done alerts.",
            },
          ],
        },
      ],
    },
  };
}

function includesCommand(settings: JsonObject, expectedPath: string) {
  const hooks = settings.hooks;
  if (!hooks || typeof hooks !== "object") return false;

  return JSON.stringify(hooks).includes(expectedPath);
}

async function pathExists(path: string) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

function shellEscape(value: string) {
  return "'" + value.replace(/'/g, `'"'"'`) + "'";
}
