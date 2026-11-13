import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { execFileAsync } from "./exec-async";
import { getExecOptions } from "./exec-options";
import {
  getPluginCommand,
  parseClaudePlugins,
  parseCodexPlugins,
  shouldUsePluginShell,
  type InstalledPlugin,
  type PluginAction,
} from "./installed-plugins";

async function runPluginCli(binary: "claude" | "codex", args: string[]): Promise<string> {
  const options = await getExecOptions();
  const { stdout } = await execFileAsync(binary, args, {
    ...options,
    env: { ...options.env, PATH: `${join(homedir(), ".local", "bin")}${delimiter}${options.env.PATH}` },
    timeout: 30_000,
    maxBuffer: 3 * 1024 * 1024,
    shell: shouldUsePluginShell(args),
  });
  return stdout;
}

export async function listInstalledPlugins(): Promise<{
  plugins: InstalledPlugin[];
  errors: Partial<Record<InstalledPlugin["host"], string>>;
}> {
  const [claude, codex] = await Promise.allSettled([
    runPluginCli("claude", ["plugin", "list", "--json"]).then(parseClaudePlugins),
    runPluginCli("codex", ["plugin", "list", "--json"]).then(parseCodexPlugins),
  ]);
  const plugins = [
    ...(claude.status === "fulfilled" ? claude.value : []),
    ...(codex.status === "fulfilled" ? codex.value : []),
  ];
  const errors: Partial<Record<InstalledPlugin["host"], string>> = {};
  if (claude.status === "rejected") errors["Claude Code"] = String(claude.reason);
  if (codex.status === "rejected") errors.Codex = String(codex.reason);
  return { plugins, errors };
}

export async function runPluginAction(plugin: InstalledPlugin, action: PluginAction): Promise<void> {
  const command = getPluginCommand(plugin, action);
  if (!command) throw new Error(`Cannot ${action} ${plugin.host} plugin in ${plugin.scope ?? "unknown"} scope`);
  await runPluginCli(command.binary, command.args);
}
