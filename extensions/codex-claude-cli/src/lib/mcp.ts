import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";

import { shellQuote } from "./commands";
export type McpProvider = "claude" | "codex";
export type McpTransport = "stdio" | "http" | "unknown";
export type McpScope = "local" | "user" | "project";
export type McpStatus = "connected" | "configured" | "needs-auth" | "disabled" | "pending" | "error" | "unknown";

export interface McpServer {
  id: string;
  provider: McpProvider;
  name: string;
  transport: McpTransport;
  status: McpStatus;
  statusLabel: string;
  enabled: boolean;
  scope?: McpScope;
  command?: string;
  arguments?: string[];
  url?: string;
  cwd?: string;
  environmentNames: string[];
  headerNames: string[];
  bearerTokenEnvironmentName?: string;
  summary?: string;
  workingDirectory: string;
  checkedAt: number;
}

export interface McpInventory {
  servers: McpServer[];
  errors: Partial<Record<McpProvider, string>>;
  checkedAt: number;
}

export interface AddMcpServerInput {
  provider: McpProvider;
  name: string;
  transport: Exclude<McpTransport, "unknown">;
  command?: string;
  argumentsText?: string;
  url?: string;
  scope?: McpScope;
  workingDirectory?: string;
}

interface CommandResult {
  stdout: string;
  stderr: string;
}

interface RunOptions {
  cwd: string;
  timeout: number;
  operation: string;
}

const listTimeout = 35_000;
const mutationTimeout = 25_000;
const authenticationTimeout = 120_000;
const maximumOutputBytes = 4 * 1_024 * 1_024;

export async function loadMcpInventory(workingDirectory = process.cwd()): Promise<McpInventory> {
  const normalizedWorkingDirectory = await validateWorkingDirectory(workingDirectory);
  const checkedAt = Date.now();
  const [codexResult, claudeResult] = await Promise.all([
    loadProviderInventory("codex", normalizedWorkingDirectory, checkedAt),
    loadProviderInventory("claude", normalizedWorkingDirectory, checkedAt),
  ]);
  const errors: Partial<Record<McpProvider, string>> = {};

  if (codexResult.error) errors.codex = codexResult.error;
  if (claudeResult.error) errors.claude = claudeResult.error;

  return {
    servers: [...codexResult.servers, ...claudeResult.servers].sort((first, second) => {
      const providerOrder = first.provider.localeCompare(second.provider);
      return providerOrder || first.name.localeCompare(second.name, "en", { sensitivity: "base" });
    }),
    errors,
    checkedAt,
  };
}

export async function addMcpServer(input: AddMcpServerInput): Promise<void> {
  const name = validateServerName(input.name);
  const cwd = await validateWorkingDirectory(input.workingDirectory || process.cwd());
  const scope = input.scope || "local";
  let argumentsList: string[];

  if (input.transport === "stdio") {
    const command = validateCommand(input.command || "");
    const commandArguments = parseCommandArguments(input.argumentsText || "");
    argumentsList =
      input.provider === "codex"
        ? ["mcp", "add", name, "--", command, ...commandArguments]
        : ["mcp", "add", "--scope", scope, name, "--", command, ...commandArguments];
  } else {
    const url = validateHttpUrl(input.url || "");
    argumentsList =
      input.provider === "codex"
        ? ["mcp", "add", name, "--url", url]
        : ["mcp", "add", "--scope", scope, "--transport", "http", name, url];
  }

  await runCli(input.provider, argumentsList, {
    cwd,
    timeout: mutationTimeout,
    operation: `add ${name}`,
  });
}

export async function removeMcpServer(server: McpServer): Promise<void> {
  const argumentsList = ["mcp", "remove"];
  if (server.provider === "claude" && server.scope) argumentsList.push("--scope", server.scope);
  argumentsList.push(server.name);
  await runCli(server.provider, argumentsList, {
    cwd: server.workingDirectory,
    timeout: mutationTimeout,
    operation: `remove ${server.name}`,
  });
}

export async function loginMcpServer(server: McpServer): Promise<void> {
  await runCli(server.provider, ["mcp", "login", server.name], {
    cwd: server.workingDirectory,
    timeout: authenticationTimeout,
    operation: `sign in to ${server.name}`,
  });
}

export async function logoutMcpServer(server: McpServer): Promise<void> {
  await runCli(server.provider, ["mcp", "logout", server.name], {
    cwd: server.workingDirectory,
    timeout: mutationTimeout,
    operation: `sign out of ${server.name}`,
  });
}

export function safeMcpConfiguration(server: McpServer): string {
  const safeConfiguration = {
    provider: providerTitle(server.provider),
    name: server.name,
    transport: transportTitle(server.transport),
    status: server.statusLabel,
    ...(server.scope ? { scope: scopeTitle(server.scope) } : {}),
    ...(server.command ? { command: server.command } : {}),
    ...(server.arguments?.length ? { arguments: sanitizeArguments(server.arguments) } : {}),
    ...(server.url ? { url: sanitizeUrl(server.url) } : {}),
    ...(server.cwd ? { working_directory: server.cwd } : {}),
    ...(server.environmentNames.length ? { environment_variable_names: server.environmentNames } : {}),
    ...(server.headerNames.length ? { header_names: server.headerNames } : {}),
    ...(server.bearerTokenEnvironmentName
      ? { bearer_token_environment_variable: server.bearerTokenEnvironmentName }
      : {}),
  };

  return JSON.stringify(safeConfiguration, null, 2);
}

export function mcpConfigPath(serverOrProvider: McpServer | McpProvider, scope?: McpScope, cwd?: string): string {
  const provider = typeof serverOrProvider === "string" ? serverOrProvider : serverOrProvider.provider;
  const resolvedScope = typeof serverOrProvider === "string" ? scope : serverOrProvider.scope;
  const workingDirectory =
    typeof serverOrProvider === "string" ? cwd || process.cwd() : serverOrProvider.workingDirectory;

  if (provider === "codex") {
    return join(resolve(expandHome(process.env.CODEX_HOME?.trim() || "~/.codex")), "config.toml");
  }

  if (resolvedScope === "project") return join(workingDirectory, ".mcp.json");
  return join(homedir(), ".claude.json");
}

export function mcpConfigRevealPath(server: McpServer): string {
  const configurationPath = mcpConfigPath(server);
  return existsSync(configurationPath) ? configurationPath : dirname(configurationPath);
}

export function providerTitle(provider: McpProvider): string {
  return provider === "codex" ? "Codex" : "Claude";
}

export function transportTitle(transport: McpTransport): string {
  if (transport === "stdio") return "STDIO";
  if (transport === "http") return "HTTP";
  return "Unknown";
}

export function scopeTitle(scope: McpScope): string {
  if (scope === "user") return "User";
  if (scope === "project") return "Project";
  return "Local";
}

export function statusTitle(status: McpStatus): string {
  if (status === "connected") return "Connected";
  if (status === "configured") return "Configured";
  if (status === "needs-auth") return "Authentication Required";
  if (status === "disabled") return "Disabled";
  if (status === "pending") return "Pending";
  if (status === "error") return "Error";
  return "Unknown";
}

function parseCommandArguments(source: string): string[] {
  const argumentsList: string[] = [];
  let current = "";
  let quote: "'" | '"' | undefined;
  let escaped = false;

  for (const character of source.trim()) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }

    if (character === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }

    if (quote) {
      if (character === quote) quote = undefined;
      else current += character;
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }

    if (/\s/u.test(character)) {
      if (current) {
        argumentsList.push(current);
        current = "";
      }
      continue;
    }

    current += character;
  }

  if (escaped) current += "\\";
  if (quote) throw new Error("There is an unclosed quote in the arguments.");
  if (current) argumentsList.push(current);
  return argumentsList;
}

async function loadProviderInventory(
  provider: McpProvider,
  workingDirectory: string,
  checkedAt: number,
): Promise<{ servers: McpServer[]; error?: string }> {
  try {
    const servers =
      provider === "codex"
        ? await loadCodexServers(workingDirectory, checkedAt)
        : await loadClaudeServers(workingDirectory, checkedAt);
    return { servers };
  } catch (error) {
    return { servers: [], error: safeErrorMessage(error, provider) };
  }
}

async function loadCodexServers(workingDirectory: string, checkedAt: number): Promise<McpServer[]> {
  const result = await runCli("codex", ["mcp", "list", "--json"], {
    cwd: workingDirectory,
    timeout: listTimeout,
    operation: "list servers",
  });
  const parsed = parseJsonArray(result.stdout);

  return parsed.flatMap((value): McpServer[] => {
    const record = objectValue(value);
    const transport = objectValue(record?.transport);
    const name = stringValue(record?.name).trim();
    if (!record || !transport || !name) return [];

    const enabled = booleanValue(record.enabled, true);
    const rawAuthStatus = stringValue(record.auth_status);
    const status = codexStatus(enabled, rawAuthStatus);
    const transportType = codexTransport(stringValue(transport.type));
    const hiddenValues = uniqueSorted([
      ...objectStringValues(transport.env),
      ...objectStringValues(transport.http_headers),
      ...objectStringValues(transport.env_http_headers),
    ]);
    const command =
      transportType === "stdio"
        ? hideSensitiveValues(sanitizeCommand(stringValue(transport.command)), hiddenValues)
        : undefined;
    const argumentsList =
      transportType === "stdio"
        ? sanitizeArguments(stringArray(transport.args)).map((argument) => hideSensitiveValues(argument, hiddenValues))
        : undefined;
    const environmentNames = uniqueSorted([...objectKeys(transport.env), ...stringArray(transport.env_vars)]);
    const headerNames = uniqueSorted([
      ...objectKeys(transport.http_headers),
      ...objectKeys(transport.env_http_headers),
    ]);
    const safeUrl = transportType === "http" ? sanitizeUrl(stringValue(transport.url)) : undefined;
    const url = safeUrl ? hideSensitiveValues(safeUrl, hiddenValues) : undefined;
    const safeCwd = sanitizePath(stringValue(transport.cwd));
    const cwd = safeCwd ? hideSensitiveValues(safeCwd, hiddenValues) : undefined;
    const disabledReason = hideSensitiveValues(sanitizeFreeText(stringValue(record.disabled_reason)), hiddenValues);

    return [
      {
        id: `codex:${name}`,
        provider: "codex",
        name,
        transport: transportType,
        status,
        statusLabel: statusTitle(status),
        enabled,
        command: command || undefined,
        arguments: argumentsList?.length ? argumentsList : undefined,
        url,
        cwd,
        environmentNames,
        headerNames,
        bearerTokenEnvironmentName: safeEnvironmentName(stringValue(transport.bearer_token_env_var)),
        summary: disabledReason || undefined,
        workingDirectory,
        checkedAt,
      },
    ];
  });
}

async function loadClaudeServers(workingDirectory: string, checkedAt: number): Promise<McpServer[]> {
  const result = await runCli("claude", ["mcp", "list"], {
    cwd: workingDirectory,
    timeout: listTimeout,
    operation: "check servers",
  });
  const output = `${result.stdout}\n${result.stderr}`;
  const servers = new Map<string, McpServer>();

  for (const rawLine of output.split(/\r?\n/u)) {
    const parsed = parseClaudeServerLine(rawLine, workingDirectory, checkedAt);
    if (parsed) servers.set(parsed.id, parsed);
  }

  if (servers.size === 0 && !/no\s+mcp|no\s+servers/iu.test(output)) {
    const meaningfulOutput = stripAnsi(output)
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !/checking\s+mcp/iu.test(line));
    if (meaningfulOutput.length > 0) throw new Error("Claude returned an unrecognized list format.");
  }

  return [...servers.values()];
}

function parseClaudeServerLine(rawLine: string, workingDirectory: string, checkedAt: number): McpServer | undefined {
  const line = stripAnsi(rawLine).trim();
  if (!line || /checking\s+mcp|no\s+mcp/iu.test(line)) return undefined;

  const statusMatch = line.match(/^(.*?)\s+-\s+((?:[✔✓✘✗!⚠⏸●○]|connected|failed|pending|disabled|needs).*)$/iu);
  if (!statusMatch) return undefined;

  const identityAndConfiguration = statusMatch[1].trim();
  const statusText = statusMatch[2].trim();
  const separatorIndex = identityAndConfiguration.indexOf(": ");
  const name = (
    separatorIndex >= 0 ? identityAndConfiguration.slice(0, separatorIndex) : identityAndConfiguration
  ).trim();
  const rawConfiguration = separatorIndex >= 0 ? identityAndConfiguration.slice(separatorIndex + 2).trim() : "";
  if (!name) return undefined;

  const url = extractSafeUrl(rawConfiguration);
  const transport = inferClaudeTransport(rawConfiguration, url);
  const scope = inferClaudeScope(rawConfiguration);
  const status = claudeStatus(statusText);
  const summary =
    transport === "http"
      ? "Servidor HTTP configurado mediante Claude CLI."
      : transport === "stdio"
        ? "Servidor STDIO configurado mediante Claude CLI."
        : "Servidor configurado mediante Claude CLI.";

  return {
    id: `claude:${scope || "resolved"}:${name}`,
    provider: "claude",
    name,
    transport,
    status,
    statusLabel: statusTitle(status),
    enabled: status !== "disabled",
    scope,
    url,
    environmentNames: [],
    headerNames: [],
    summary,
    workingDirectory,
    checkedAt,
  };
}

function parseJsonArray(source: string): unknown[] {
  const trimmed = source.trim();
  const candidates = [trimmed];
  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) candidates.push(trimmed.slice(firstBracket, lastBracket + 1));

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      continue;
    }
  }

  throw new Error("Codex returned invalid MCP JSON.");
}

function codexTransport(value: string): McpTransport {
  const normalized = value.toLowerCase();
  if (normalized === "stdio") return "stdio";
  if (normalized.includes("http") || normalized.includes("sse")) return "http";
  return "unknown";
}

function inferClaudeTransport(configuration: string, url?: string): McpTransport {
  if (url || /\b(?:http|sse|websocket|ws)\b/iu.test(configuration)) return "http";
  if (configuration) return "stdio";
  return "unknown";
}

function inferClaudeScope(configuration: string): McpScope | undefined {
  if (/\bproject\b|\.mcp\.json/iu.test(configuration)) return "project";
  if (/\buser\b/iu.test(configuration)) return "user";
  if (/\blocal\b/iu.test(configuration)) return "local";
  return undefined;
}

function codexStatus(enabled: boolean, authenticationStatus: string): McpStatus {
  if (!enabled) return "disabled";
  const normalized = authenticationStatus.toLowerCase();
  if (/not[_ -]?logged|needs?[_ -]?auth|unauthenticated|login[_ -]?required/iu.test(normalized)) return "needs-auth";
  if (/error|failed/iu.test(normalized)) return "error";
  return "configured";
}

function claudeStatus(value: string): McpStatus {
  const normalized = value.toLowerCase();
  if (/connected|healthy|running/iu.test(normalized)) return "connected";
  if (/needs?\s+authentication|not\s+authenticated|login/iu.test(normalized)) return "needs-auth";
  if (/pending|approval/iu.test(normalized)) return "pending";
  if (/disabled/iu.test(normalized)) return "disabled";
  if (/failed|error|disconnected|unreachable/iu.test(normalized)) return "error";
  return "unknown";
}

function validateServerName(source: string): string {
  const name = source.trim();
  if (!name) throw new Error("Enter a name for the MCP server.");
  if (name.length > 100) throw new Error("The server name is too long.");
  if (name.startsWith("-")) throw new Error("The server name cannot start with a dash.");
  if (/[\r\n\0]/u.test(name)) throw new Error("The name contains unsupported characters.");
  return name;
}

function validateCommand(source: string): string {
  const command = source.trim();
  if (!command) throw new Error("Enter the STDIO server executable.");
  if (/[\r\n\0]/u.test(command)) throw new Error("The command contains unsupported characters.");
  return command;
}

function validateHttpUrl(source: string): string {
  try {
    const parsed = new URL(source.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
    if (parsed.username || parsed.password) throw new Error();
    return parsed.toString();
  } catch {
    throw new Error("Enter a valid HTTP or HTTPS URL without embedded credentials.");
  }
}

async function validateWorkingDirectory(source: string): Promise<string> {
  const directoryPath = resolve(expandHome(source.trim() || process.cwd()));
  const fileStats = await stat(directoryPath).catch(() => undefined);
  if (!fileStats?.isDirectory()) throw new Error("The working directory does not exist or is not a folder.");
  return directoryPath;
}

function runCli(provider: McpProvider, argumentsList: string[], options: RunOptions): Promise<CommandResult> {
  const command = `exec ${shellQuote(provider)} ${argumentsList.map(shellQuote).join(" ")}`;

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("/bin/zsh", ["-lic", command], {
      cwd: options.cwd,
      env: {
        ...process.env,
        NO_COLOR: "1",
        TERM: "dumb",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    let outputExceeded = false;
    let outputBytes = 0;
    let forceKillTimer: ReturnType<typeof setTimeout> | undefined;

    const stopChild = () => {
      child.kill("SIGTERM");
      if (forceKillTimer) return;
      forceKillTimer = setTimeout(() => child.kill("SIGKILL"), 1_500);
      forceKillTimer.unref();
    };
    const clearTimers = () => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (forceKillTimer) clearTimeout(forceKillTimer);
    };

    const finishWithError = (message: string) => {
      if (settled) return;
      settled = true;
      clearTimers();
      rejectPromise(new Error(message));
    };
    const appendOutput = (current: string, chunk: Buffer | string): string => {
      if (outputExceeded) return current;
      const text = chunk.toString();
      outputBytes += Buffer.byteLength(text);
      if (outputBytes <= maximumOutputBytes) return current + text;
      outputExceeded = true;
      stopChild();
      return current;
    };

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout = appendOutput(stdout, chunk);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr = appendOutput(stderr, chunk);
    });
    child.on("error", () => {
      finishWithError(`Could not start ${providerTitle(provider)} from the login shell.`);
    });

    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      stopChild();
    }, options.timeout);

    child.on("close", (exitCode) => {
      clearTimers();
      if (settled) return;
      settled = true;

      if (timedOut) {
        rejectPromise(
          new Error(
            `Timed out while trying to ${options.operation} in ${providerTitle(provider)}. Check any open browser window.`,
          ),
        );
        return;
      }
      if (outputExceeded) {
        rejectPromise(
          new Error(`${providerTitle(provider)} produced too much output while trying to ${options.operation}.`),
        );
        return;
      }
      if (exitCode !== 0) {
        const detail = sanitizeErrorOutput(stderr || stdout);
        rejectPromise(
          new Error(`Could not ${options.operation} in ${providerTitle(provider)}${detail ? `: ${detail}` : "."}`),
        );
        return;
      }

      resolvePromise({ stdout, stderr });
    });
  });
}

function sanitizeArguments(argumentsList: string[]): string[] {
  let redactNext = false;
  return argumentsList.map((argument) => {
    if (redactNext) {
      redactNext = false;
      return "<hidden>";
    }

    if (/^--?(?:token|secret|password|api[-_]?key|authorization|header|client-secret)$/iu.test(argument)) {
      redactNext = true;
      return argument;
    }
    if (/^--?(?:token|secret|password|api[-_]?key|authorization|header|client-secret)=/iu.test(argument)) {
      return `${argument.slice(0, argument.indexOf("=") + 1)}<hidden>`;
    }
    if (/^[A-Z][A-Z0-9_]{1,}=.+$/u.test(argument)) return `${argument.slice(0, argument.indexOf("="))}=<hidden>`;
    if (/^Bearer\s+/iu.test(argument)) return "Bearer <hidden>";
    return sanitizeFreeText(argument);
  });
}

function sanitizeCommand(source: string): string {
  return sanitizeFreeText(source)
    .replace(/[\r\n]/gu, " ")
    .trim();
}

function sanitizePath(source: string): string {
  return source.replace(/[\r\n\0]/gu, "").trim();
}

function sanitizeUrl(source: string): string | undefined {
  if (!source) return undefined;
  try {
    const parsed = new URL(source);
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function extractSafeUrl(source: string): string | undefined {
  const match = source.match(/https?:\/\/[^\s,)]+/iu);
  return match ? sanitizeUrl(match[0]) : undefined;
}

function sanitizeFreeText(source: string): string {
  return stripAnsi(source)
    .replace(/((?:--header|-H)\s+)(?:"[^"]*"|'[^']*'|\S+)/giu, "$1<hidden>")
    .replace(/\bBearer\s+[^\s,;]+/giu, "Bearer <hidden>")
    .replace(
      /\b((?:api[-_]?key|token|secret|password|authorization|client[-_]?secret)\s*[:=]\s*)[^\s,;]+/giu,
      "$1<hidden>",
    )
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*)=(?:"[^"]*"|'[^']*'|[^\s]+)/gu, "$1=<hidden>")
    .replace(/https?:\/\/[^\s,)]+/giu, (url) => sanitizeUrl(url) || "<hidden URL>")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 500);
}

function sanitizeErrorOutput(source: string): string {
  return sanitizeFreeText(source).split(/\r?\n/u).filter(Boolean).slice(-3).join(" · ").slice(0, 300);
}

function safeErrorMessage(error: unknown, provider: McpProvider): string {
  if (error instanceof Error) return sanitizeFreeText(error.message) || `${providerTitle(provider)} did not respond.`;
  return `${providerTitle(provider)} did not respond.`;
}

function safeEnvironmentName(source: string): string | undefined {
  const name = source.trim();
  return /^[A-Za-z_][A-Za-z0-9_]*$/u.test(name) ? name : undefined;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function objectKeys(value: unknown): string[] {
  return Object.keys(objectValue(value) || {}).filter((key) => /^[A-Za-z0-9_.-]+$/u.test(key));
}

function objectStringValues(value: unknown): string[] {
  return Object.values(objectValue(value) || {}).filter(
    (entry): entry is string => typeof entry === "string" && entry.length > 0,
  );
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((first, second) => first.localeCompare(second));
}

function hideSensitiveValues(source: string, hiddenValues: string[]): string {
  let sanitized = source;
  for (const hiddenValue of [...hiddenValues].sort((first, second) => second.length - first.length)) {
    if (sanitized.includes(hiddenValue)) sanitized = sanitized.replaceAll(hiddenValue, "<hidden>");
  }
  return sanitized;
}

function stripAnsi(source: string): string {
  return stripVTControlCharacters(source);
}

function expandHome(sourcePath: string): string {
  if (sourcePath === "~") return homedir();
  if (sourcePath.startsWith("~/")) return join(homedir(), sourcePath.slice(2));
  return sourcePath;
}
