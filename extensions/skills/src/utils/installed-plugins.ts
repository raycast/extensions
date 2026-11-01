export type InstalledPlugin = {
  host: "Claude Code" | "Codex";
  id: string;
  name: string;
  version?: string;
  scope?: string;
  projectPath?: string;
  marketplace?: string;
  enabled?: boolean;
  path?: string;
};

export type PluginAction = "enable" | "disable" | "remove";

const WINDOWS_SAFE_CLI_ARG = /^[a-zA-Z0-9@._/+:=-]+$/;

export function shouldUsePluginShell(args: string[], platform = process.platform): boolean {
  if (platform !== "win32") return false;
  if (args.some((arg) => !WINDOWS_SAFE_CLI_ARG.test(arg))) {
    throw new Error("Unsafe plugin CLI argument for Windows command shell");
  }
  return true;
}

export function pluginRowId(plugin: InstalledPlugin): string {
  return [plugin.host, plugin.id, plugin.scope ?? "", plugin.projectPath ?? ""].join(":");
}

export function getPluginCommand(
  plugin: InstalledPlugin,
  action: PluginAction,
): { binary: "claude" | "codex"; args: string[] } | undefined {
  if (plugin.host === "Claude Code") {
    // Project/local scope needs its owning project directory, which Raycast does not know.
    if (plugin.scope !== "user") return undefined;
    return {
      binary: "claude",
      args:
        action === "remove"
          ? ["plugin", "uninstall", plugin.id, "--scope", "user", "--keep-data", "--json"]
          : ["plugin", action, plugin.id, "--scope", "user", "--json"],
    };
  }
  if (plugin.host === "Codex" && action === "remove") {
    return { binary: "codex", args: ["plugin", "remove", plugin.id, "--json"] };
  }
  return undefined;
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseClaudePlugins(output: string): InstalledPlugin[] {
  const parsed: unknown = JSON.parse(output);
  if (!Array.isArray(parsed)) throw new Error("Claude plugin list must return an array");
  return parsed.map((value) => {
    if (!object(value) || typeof value.id !== "string") throw new Error("Claude plugin entry needs an id");
    return {
      host: "Claude Code",
      id: value.id,
      name: value.id.split("@")[0],
      version: typeof value.version === "string" ? value.version : undefined,
      scope: typeof value.scope === "string" ? value.scope : undefined,
      projectPath: typeof value.projectPath === "string" ? value.projectPath : undefined,
      enabled: typeof value.enabled === "boolean" ? value.enabled : undefined,
      path: typeof value.installPath === "string" ? value.installPath : undefined,
    };
  });
}

export function parseCodexPlugins(output: string): InstalledPlugin[] {
  const parsed: unknown = JSON.parse(output);
  if (!object(parsed) || !Array.isArray(parsed.installed)) throw new Error("Codex plugin list needs installed array");
  return parsed.installed.map((value) => {
    if (!object(value) || typeof value.pluginId !== "string") throw new Error("Codex plugin entry needs a pluginId");
    return {
      host: "Codex",
      id: value.pluginId,
      name: typeof value.name === "string" ? value.name : value.pluginId.split("@")[0],
      version: typeof value.version === "string" ? value.version : undefined,
      marketplace: typeof value.marketplaceName === "string" ? value.marketplaceName : undefined,
      enabled: typeof value.enabled === "boolean" ? value.enabled : undefined,
      path:
        object(value.source) && value.source.source === "local" && typeof value.source.path === "string"
          ? value.source.path
          : undefined,
    };
  });
}
