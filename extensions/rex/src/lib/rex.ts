import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";
import type { RexActivity, RexClient, RexHost, RexProcessInfo, RexSession, RexStatusRecord } from "../types";

const execFileAsync = promisify(execFile);

// Windows ships the CLI as rex.exe and installs it on PATH; other platforms use a bare rex binary.
const isWindows = process.platform === "win32";
const CLI_NAME = isWindows ? "rex.exe" : "rex";

const REX_SERVER_CLI = [
  "Library",
  "Application Support",
  "com.superlogical.rex",
  "RexServer",
  "Versions",
  "Current",
  "Rex Server.app",
  "Contents",
  "MacOS",
  "rex",
];

function isExecutable(candidate: string): boolean {
  try {
    accessSync(candidate, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function findRexOnPath(): string | undefined {
  const pathValue = process.env.PATH;
  if (!pathValue) {
    return undefined;
  }

  for (const entry of pathValue.split(delimiter)) {
    // Windows PATH entries are commonly wrapped in double quotes.
    const directory = isWindows ? entry.trim().replace(/^"(.*)"$/, "$1") : entry;

    if (!directory) {
      continue;
    }

    const candidate = join(directory, CLI_NAME);
    if (isExecutable(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function cliCandidates(): string[] {
  const platformFallbacks: string[] = [];

  // The Rex installer puts rex.exe on PATH on Windows, so the macOS-only
  // Homebrew, ~/.local/bin and app-bundle locations are not searched there.
  if (!isWindows) {
    platformFallbacks.push(
      join(homedir(), ".local", "bin", "rex"),
      "/opt/homebrew/bin/rex",
      "/usr/local/bin/rex",
      join(homedir(), ...REX_SERVER_CLI),
    );
  }

  const candidates = [process.env.REX_CLI, findRexOnPath(), ...platformFallbacks].filter(
    (candidate): candidate is string => Boolean(candidate),
  );

  return [...new Set(candidates)];
}

let resolvedCli: string | undefined;

function resolveCli(): string {
  if (resolvedCli) {
    return resolvedCli;
  }

  const candidate = cliCandidates().find(isExecutable);
  if (!candidate) {
    throw new Error(
      isWindows
        ? "Could not find the Rex CLI. Install Rex so rex.exe is on your PATH, or set the REX_CLI environment variable to the rex.exe path."
        : "Could not find the Rex CLI. Install Rex, or set the REX_CLI environment variable to the rex executable.",
    );
  }

  resolvedCli = candidate;
  return candidate;
}

function describeError(error: unknown): string {
  if (error && typeof error === "object") {
    const { stderr, message } = error as { stderr?: unknown; message?: unknown };
    if (typeof stderr === "string" && stderr.trim()) {
      return stderr.trim();
    }
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  return "Rex returned an unexpected error.";
}

// Every Rex CLI call funnels through runRex. A workspace can contain many
// sessions and windows, and activity loading reads status and process info for
// every block, so cap how many child processes run at once. Waiters are queued
// FIFO instead of fanning out all at once.
const MAX_CONCURRENT_CLI_PROCESSES = 4;

let activeCliProcesses = 0;
const pendingCliStarts: Array<() => void> = [];

function acquireCliSlot(): Promise<void> {
  if (activeCliProcesses < MAX_CONCURRENT_CLI_PROCESSES) {
    activeCliProcesses += 1;
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    pendingCliStarts.push(resolve);
  });
}

function releaseCliSlot(): void {
  const nextStart = pendingCliStarts.shift();

  // Hand the slot straight to the next waiter so the active count is unchanged.
  if (nextStart) {
    nextStart();
    return;
  }

  activeCliProcesses -= 1;
}

async function runRex(args: string[]): Promise<string> {
  const cli = resolveCli();

  await acquireCliSlot();

  try {
    const { stdout } = await execFileAsync(cli, args, { maxBuffer: 10 * 1024 * 1024 });
    return stdout;
  } catch (error) {
    throw new Error(describeError(error));
  } finally {
    releaseCliSlot();
  }
}

function parseJson<T>(stdout: string): T {
  const trimmed = stdout.trim();

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }

    throw new Error("Rex returned an unexpected response.");
  }
}

export async function listSessions(): Promise<RexSession[]> {
  const response = parseJson<{ sessions?: RexSession[] }>(await runRex(["ls", "--json", "--autostart=false"]));

  if (!Array.isArray(response.sessions)) {
    throw new Error("Rex did not return a list of sessions.");
  }

  return response.sessions.filter(
    (session): session is RexSession => typeof session?.session_id === "string" && typeof session?.label === "string",
  );
}

type JsonRecord = Record<string, unknown>;

interface HostDetails {
  host: RexHost;
  endpoints: string[];
  /** Additional registry IDs that identify the same host. */
  aliases: string[];
}

interface LoadedHosts {
  hosts: RexHost[];
  details: HostDetails[];
  /** Keys for online hosts that are known without a check, such as this Mac. */
  localKeys: string[];
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: JsonRecord, key: string): string | undefined {
  const value = record[key];

  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readStringArray(record: JsonRecord, key: string): string[] {
  const value = record[key];

  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => (typeof item === "string" && item.trim() ? [item.trim()] : []));
}

function normalizeId(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeEndpoint(value: string): string {
  const trimmed = value.trim();
  let decoded = trimmed;

  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    // Keep the original text when it contains a malformed escape.
  }

  return decoded.replace(/\/+$/, "").toLowerCase();
}

function isLocalHostId(candidate: string | undefined, localHostId: string | undefined): boolean {
  return Boolean(candidate && localHostId && normalizeId(candidate) === normalizeId(localHostId));
}

function readListenerEndpoints(status: JsonRecord): string[] {
  const listeners = status.listeners;

  if (!Array.isArray(listeners)) {
    return [];
  }

  return listeners.flatMap((listener) => {
    if (!isJsonRecord(listener)) {
      return [];
    }

    const endpoint = readString(listener, "endpoint");

    return endpoint ? [endpoint] : [];
  });
}

async function loadHostData(): Promise<LoadedHosts> {
  const [hostsResult, statusResult] = await Promise.allSettled([
    runRex(["hosts", "--json", "--autostart=false"]),
    runRex(["api", "call", "server.status", "--autostart=false"]),
  ] as const);

  let registry: JsonRecord | undefined;
  let registryError: unknown;

  if (hostsResult.status === "fulfilled") {
    try {
      const parsed = parseJson<unknown>(hostsResult.value);

      if (isJsonRecord(parsed)) {
        registry = parsed;
      } else {
        throw new Error("Rex did not return host registry information.");
      }
    } catch (error) {
      registryError = error;
    }
  } else {
    registryError = hostsResult.reason;
  }

  let serverStatus: JsonRecord | undefined;

  if (statusResult.status === "fulfilled") {
    try {
      const parsed = parseJson<unknown>(statusResult.value);

      if (isJsonRecord(parsed)) {
        serverStatus = parsed;
      }
    } catch {
      // A malformed status only means this Mac's host ID is unknown.
    }
  }

  if (!registry && !serverStatus) {
    if (registryError instanceof Error) {
      throw registryError;
    }

    throw new Error("Rex did not return its hosts or server status.");
  }

  const rawHostsValue = registry?.hosts;
  const rawHosts = Array.isArray(rawHostsValue) ? rawHostsValue : [];

  if (rawHostsValue !== undefined && rawHostsValue !== null && !Array.isArray(rawHostsValue)) {
    throw new Error("Rex did not return a list of hosts.");
  }

  const home = registry && isJsonRecord(registry.home) ? registry.home : undefined;
  const homeLabel = home ? readString(home, "label") : undefined;
  const homeEndpoint = home ? readString(home, "endpoint") : undefined;
  const homeIsThisMachine = home?.this_machine === true;
  const localHostId = serverStatus ? readString(serverStatus, "host_id") : undefined;
  const localEndpoints = [
    ...(serverStatus ? readListenerEndpoints(serverStatus) : []),
    ...(homeIsThisMachine && homeEndpoint ? [homeEndpoint] : []),
  ];

  const configured: HostDetails[] = [];
  const seenIds = new Set<string>();
  const seenHostIds = new Set<string>();

  for (const rawHost of rawHosts) {
    if (!isJsonRecord(rawHost)) {
      continue;
    }

    const rawId = readString(rawHost, "id");
    const hostId = readString(rawHost, "host_id");
    const label = readString(rawHost, "label") ?? hostId ?? rawId;
    const id = rawId ?? hostId ?? label;

    if (!id || !label) {
      continue;
    }

    const normalizedId = normalizeId(id);

    if (seenIds.has(normalizedId) || (hostId && seenHostIds.has(normalizeId(hostId)))) {
      continue;
    }

    seenIds.add(normalizedId);

    if (hostId) {
      seenHostIds.add(normalizeId(hostId));
    }

    const endpoints = readStringArray(rawHost, "endpoints");
    const endpoint = readString(rawHost, "endpoint");

    if (endpoint && !endpoints.includes(endpoint)) {
      endpoints.push(endpoint);
    }

    configured.push({
      host: { id, label, host_id: hostId, is_local: false },
      endpoints,
      aliases: [rawId, hostId].filter((value): value is string => Boolean(value)),
    });
  }

  let localConfigured: HostDetails | undefined;

  if (localHostId) {
    localConfigured = configured.find((entry) => isLocalHostId(entry.host.host_id, localHostId));
  }

  if (!localConfigured && localEndpoints.length > 0) {
    const normalizedLocalEndpoints = new Set(localEndpoints.map(normalizeEndpoint));
    localConfigured = configured.find((entry) =>
      entry.endpoints.some((endpoint) => normalizedLocalEndpoints.has(normalizeEndpoint(endpoint))),
    );
  }

  if (localConfigured) {
    localConfigured.host.is_local = true;
  }

  const details: HostDetails[] = [];
  const localKeys: string[] = [];

  if (serverStatus) {
    const id = localConfigured?.host.id ?? localHostId ?? "local";
    const label = localConfigured?.host.label ?? (homeIsThisMachine ? homeLabel : undefined) ?? "This Mac";
    const endpoints = localConfigured?.endpoints ?? localEndpoints;
    const aliases = [
      ...(localConfigured?.aliases ?? []),
      ...(localConfigured?.host.host_id ? [localConfigured.host.host_id] : []),
      ...(localHostId ? [localHostId] : []),
      ...localEndpoints,
    ];

    details.push({
      host: {
        id,
        label,
        host_id: localHostId ?? localConfigured?.host.host_id,
        is_local: true,
      },
      endpoints,
      aliases: [...new Set(aliases)],
    });
    localKeys.push(id);
  } else if (localConfigured) {
    details.push(localConfigured);
  }

  for (const entry of configured) {
    if (entry === localConfigured) {
      continue;
    }

    details.push(entry);
  }

  const finalDetails: HostDetails[] = [];
  const finalIds = new Set<string>();
  const finalHostIds = new Set<string>();

  for (const entry of details) {
    const id = normalizeId(entry.host.id);
    const hostId = entry.host.host_id ? normalizeId(entry.host.host_id) : undefined;

    if (finalIds.has(id) || (hostId && finalHostIds.has(hostId))) {
      continue;
    }

    finalIds.add(id);

    if (hostId) {
      finalHostIds.add(hostId);
    }

    finalDetails.push(entry);
  }

  const hosts = finalDetails
    .map((entry) => entry.host)
    .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: "base", numeric: true }));

  return { hosts, details: finalDetails, localKeys };
}

/**
 * Lists the hosts in the Rex host registry plus this Mac's local server. The
 * registry and server status are read-only and do not probe remote hosts.
 */
export async function loadHosts(): Promise<RexHost[]> {
  const { hosts } = await loadHostData();

  return hosts;
}

type HostCheckStatus = "reachable" | "unreachable";

interface HostIndex {
  byId: Map<string, string>;
  byHostId: Map<string, string>;
  byLabel: Map<string, string>;
  byEndpoint: Map<string, string>;
}

function addIndexEntry(index: Map<string, string>, value: string | undefined, hostKey: string): void {
  if (!value || index.has(value)) {
    return;
  }

  index.set(value, hostKey);
}

function buildHostIndex(details: HostDetails[]): HostIndex {
  const index: HostIndex = {
    byId: new Map(),
    byHostId: new Map(),
    byLabel: new Map(),
    byEndpoint: new Map(),
  };

  for (const entry of details) {
    const hostKey = entry.host.id;

    addIndexEntry(index.byId, normalizeId(hostKey), hostKey);
    addIndexEntry(index.byHostId, entry.host.host_id ? normalizeId(entry.host.host_id) : undefined, hostKey);
    addIndexEntry(index.byLabel, entry.host.label.trim().toLowerCase(), hostKey);

    for (const endpoint of entry.endpoints) {
      addIndexEntry(index.byEndpoint, normalizeEndpoint(endpoint), hostKey);
    }

    for (const alias of entry.aliases) {
      const normalizedAlias = normalizeId(alias);

      addIndexEntry(index.byId, normalizedAlias, hostKey);
      addIndexEntry(index.byHostId, normalizedAlias, hostKey);
    }
  }

  return index;
}

function normalizeCheckStatus(value: string): HostCheckStatus | undefined {
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

  if (normalized === "reachable" || normalized === "online" || normalized === "up") {
    return "reachable";
  }

  if (
    normalized === "not reachable from here" ||
    normalized === "not reachable" ||
    normalized === "unreachable" ||
    normalized === "down" ||
    normalized === "offline"
  ) {
    return "unreachable";
  }

  return undefined;
}

function readCheckStatus(record: JsonRecord): HostCheckStatus | undefined {
  for (const key of ["status", "state", "reachable", "reachability"]) {
    const value = record[key];

    if (typeof value === "boolean") {
      if (key === "reachable" || key === "reachability") {
        return value ? "reachable" : "unreachable";
      }

      continue;
    }

    if (typeof value === "string") {
      const status = normalizeCheckStatus(value);

      if (status) {
        return status;
      }
    }
  }

  return undefined;
}

function readAttemptRecords(record: JsonRecord): JsonRecord[] {
  const attempts: JsonRecord[] = [];

  for (const key of ["attempts", "checks", "endpoints"]) {
    const value = record[key];

    if (!Array.isArray(value)) {
      continue;
    }

    for (const item of value) {
      if (isJsonRecord(item) && (readCheckStatus(item) || readString(item, "endpoint"))) {
        attempts.push(item);
      }
    }
  }

  return attempts;
}

function statusFromAttempts(attempts: JsonRecord[]): HostCheckStatus | undefined {
  let sawStatus = false;

  for (const attempt of attempts) {
    const status = readCheckStatus(attempt);

    if (!status) {
      continue;
    }

    sawStatus = true;

    if (status === "reachable") {
      return "reachable";
    }
  }

  return sawStatus ? "unreachable" : undefined;
}

function addMappedKey(target: Set<string>, index: Map<string, string>, value: string): void {
  const hostKey = index.get(value);

  if (hostKey) {
    target.add(hostKey);
  }
}

function addIdentifierKeys(record: JsonRecord, index: HostIndex, target: Set<string>): void {
  const records = [record];

  for (const key of ["host", "host_info"]) {
    const nested = record[key];

    if (isJsonRecord(nested)) {
      records.push(nested);
    }
  }

  for (const item of records) {
    for (const key of ["id", "host_id", "hostId"]) {
      const value = readString(item, key);

      if (!value) {
        continue;
      }

      const normalized = normalizeId(value);

      addMappedKey(target, index.byId, normalized);
      addMappedKey(target, index.byHostId, normalized);
    }

    for (const key of ["label", "host_label", "hostLabel"]) {
      const value = readString(item, key);

      if (value) {
        addMappedKey(target, index.byLabel, value.trim().toLowerCase());
      }
    }

    const hostValue = readString(item, "host");

    if (hostValue) {
      addMappedKey(target, index.byLabel, hostValue.trim().toLowerCase());
    }

    for (const endpoint of readStringArray(item, "endpoints")) {
      addMappedKey(target, index.byEndpoint, normalizeEndpoint(endpoint));
    }

    const endpoint = readString(item, "endpoint");

    if (endpoint) {
      addMappedKey(target, index.byEndpoint, normalizeEndpoint(endpoint));
    }
  }
}

interface ParsedHostCheck {
  keys: Set<string>;
  recognized: boolean;
  sawRecord: boolean;
}

function parseReachableHostKeys(value: unknown, details: HostDetails[]): ParsedHostCheck {
  const index = buildHostIndex(details);
  const keys = new Set<string>();
  const seen = new WeakSet<object>();
  const collectionKeys = new Set(["hosts", "results", "checks", "attempts", "endpoints", "servers", "items"]);
  let recognized = false;
  let sawRecord = false;

  const addContextKeys = (contextKey: string, target: Set<string>): boolean => {
    const before = target.size;
    const normalizedLabel = contextKey.trim().toLowerCase();

    addMappedKey(target, index.byLabel, normalizedLabel);
    addMappedKey(target, index.byId, normalizeId(contextKey));

    return target.size > before;
  };

  const visit = (node: unknown, depth: number, contextKey?: string): void => {
    if (depth > 10 || typeof node !== "object" || node === null || seen.has(node)) {
      return;
    }

    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item, depth + 1, contextKey);
      }

      return;
    }

    const record = node as JsonRecord;

    for (const [key, item] of Object.entries(record)) {
      if (collectionKeys.has(key.toLowerCase()) && Array.isArray(item)) {
        recognized = true;

        for (const entry of item) {
          visit(entry, depth + 1);
        }
      }
    }

    const attempts = readAttemptRecords(record);
    const status = readCheckStatus(record) ?? statusFromAttempts(attempts);

    if (status) {
      recognized = true;
      sawRecord = true;

      if (status === "reachable") {
        addIdentifierKeys(record, index, keys);

        if (contextKey) {
          addContextKeys(contextKey, keys);
        }
      }
    } else if (attempts.length > 0) {
      recognized = true;
    }

    for (const [key, item] of Object.entries(record)) {
      if (collectionKeys.has(key.toLowerCase())) {
        continue;
      }

      if (typeof item === "object" && item !== null) {
        visit(item, depth + 1, key);
      } else if (typeof item === "string" && normalizeCheckStatus(item) === "reachable") {
        const contextKeys = new Set<string>();

        if (addContextKeys(key, contextKeys)) {
          recognized = true;
          sawRecord = true;

          for (const hostKey of contextKeys) {
            keys.add(hostKey);
          }
        }
      }
    }
  };

  visit(value, 0);

  return { keys, recognized, sawRecord };
}

/**
 * Checks configured hosts for reachability on demand. This is the only host
 * operation that contacts remote servers, so call it only after a person asks
 * for online hosts. The local server is included when its status is available.
 */
export async function checkOnlineHosts(): Promise<string[]> {
  const { hosts, details, localKeys } = await loadHostData();

  const parsed = parseReachableHostKeys(
    parseJson<unknown>(await runRex(["hosts", "check", "--json", "--autostart=false"])),
    details,
  );

  if (!parsed.recognized) {
    throw new Error("Rex returned host check results this extension does not understand.");
  }

  const remoteHostCount = hosts.filter((host) => !host.is_local).length;

  if (!parsed.sawRecord && remoteHostCount > 0) {
    throw new Error("Rex did not report a status for any of the hosts it checked.");
  }

  return [...new Set([...localKeys, ...parsed.keys])];
}

export async function getAppClient(): Promise<RexClient> {
  const response = parseJson<{ clients?: RexClient[] }>(await runRex(["client", "ls", "--json", "--autostart=false"]));
  const clients = Array.isArray(response.clients) ? response.clients : [];
  const appClients = clients.filter((client) => client.info?.kind === "app");

  if (appClients.length === 0) {
    throw new Error("No Rex app is connected. Open Rex and try again.");
  }

  if (appClients.length > 1) {
    const names = appClients
      .map((client) => `${client.info?.label ?? client.info?.name ?? "Rex"} (${client.client_id})`)
      .join(", ");
    throw new Error(`Multiple Rex apps are connected: ${names}. Quit the extra Rex apps and try again.`);
  }

  return appClients[0];
}

async function bringRexToFront(): Promise<void> {
  if (process.platform !== "darwin") {
    return;
  }

  try {
    await execFileAsync("open", ["-b", "com.superlogical.rex"]);
  } catch (error) {
    throw new Error("The session opened, but Rex could not be brought to the foreground: " + describeError(error));
  }
}

export async function selectSession(clientId: string | undefined, sessionId: string, windowId?: string): Promise<void> {
  const appClient = clientId ? { client_id: clientId } : await getAppClient();
  const selectArgs = ["-C", appClient.client_id, "do", "session.select", "session_id=" + sessionId];

  if (windowId) {
    selectArgs.push("window_id=" + windowId);
  }

  try {
    await runRex(selectArgs);
  } catch (selectionError) {
    try {
      await runRex(["-C", appClient.client_id, "do", "client.window.new"]);
      await runRex(selectArgs);
    } catch (windowError) {
      throw new Error(
        "Could not open the session: " +
          describeError(selectionError) +
          ". Opening a Rex window and retrying also failed: " +
          describeError(windowError),
      );
    }
  }

  await bringRexToFront();
}

async function callSessionApi<T>(sessionId: string, method: string, args?: Record<string, unknown>): Promise<T> {
  const cliArgs = ["api", "call", "--session", sessionId, method];

  if (args) {
    cliArgs.push(JSON.stringify(args));
  }

  cliArgs.push("--autostart=false");

  return parseJson<T>(await runRex(cliArgs));
}

const SHELL_BLOCK_FLAVOR = "com.superlogical.terminal.shell";

export interface CreateSessionRequest {
  label: string;
  initial_windows: Array<{ layout: { block: { flavor: string } } }>;
}

export function buildCreateSessionRequest(label: string): CreateSessionRequest {
  return {
    label,
    initial_windows: [{ layout: { block: { flavor: SHELL_BLOCK_FLAVOR } } }],
  };
}

export function parseCreateSessionOutput(stdout: string): string {
  const response = parseJson<{ session_id?: unknown }>(stdout);

  if (typeof response.session_id !== "string" || !response.session_id) {
    throw new Error("Rex created the session but did not return a session ID.");
  }

  return response.session_id;
}

export async function createSession(label: string): Promise<string> {
  const args = ["api", "call", "session.create", JSON.stringify(buildCreateSessionRequest(label)), "--autostart=false"];

  return parseCreateSessionOutput(await runRex(args));
}

export async function destroySession(sessionId: string): Promise<void> {
  await runRex(["api", "call", "--session", sessionId, "session.destroy", "--autostart=false"]);
}

export async function renameSession(sessionId: string, label: string): Promise<void> {
  await runRex([
    "api",
    "call",
    "--session",
    sessionId,
    "session.set_label",
    JSON.stringify({ session_id: sessionId, label }),
    "--autostart=false",
  ]);
}

const PROGRAM_STATUS_METHOD = "com.superlogical.terminal.program_status";
const PROCESS_METHOD = "com.superlogical.terminal.process";

interface RexViewBlock {
  block_id?: string | null;
  label?: string;
  creator_name?: string;
  flavor?: string;
  host_id?: string;
  owner?: string | null;
}

interface RexPlacedBlock extends RexViewBlock {
  block_id: string;
}

interface RexViewLayer {
  blocks?: RexViewBlock[] | null;
}

interface RexViewWindow {
  window_id?: string | null;
  label?: string;
  layers?: RexViewLayer[] | null;
}

interface RexView {
  label?: string;
  windows?: RexViewWindow[] | null;
}

interface RexStatusResponse {
  records?: RexStatusRecord[] | null;
}

function hasStatusId(status: RexStatusRecord): boolean {
  return typeof status.id === "string" && status.id.trim().length > 0;
}

// Serialises a status payload with sorted keys so two records can be compared regardless of key order.
function canonicalStatusValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalStatusValue);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, canonicalStatusValue(record[key])]),
    );
  }

  return value;
}

// The status payload without the fields that legitimately differ between an id-less summary and the
// identified record it echoes.
function statusFingerprint(status: RexStatusRecord): string {
  const payload: Record<string, unknown> = { ...status };

  delete payload.id;
  delete payload.updated_at;

  return JSON.stringify(canonicalStatusValue(payload));
}

/**
 * Rex sometimes reports the same status twice: an id-less summary record and an identified record.
 * Drops an id-less record only when an identified record carries the same payload, so genuinely
 * different identified records survive.
 */
function withoutIdlessStatusEchoes(records: RexStatusRecord[]): RexStatusRecord[] {
  const identifiedFingerprints = new Set(records.filter(hasStatusId).map(statusFingerprint));

  return records.filter((record) => hasStatusId(record) || !identifiedFingerprints.has(statusFingerprint(record)));
}

async function loadBlockActivities(
  sessionId: string,
  sessionLabel: string,
  windowId: string,
  windowLabel: string,
  block: RexPlacedBlock,
): Promise<RexActivity[]> {
  const [statusResult, processResult] = await Promise.allSettled([
    callSessionApi<RexStatusResponse>(sessionId, PROGRAM_STATUS_METHOD, {
      session_id: sessionId,
      block_id: block.block_id,
    }),
    callSessionApi<RexProcessInfo>(sessionId, PROCESS_METHOD, {
      session_id: sessionId,
      block_id: block.block_id,
    }),
  ] as const);

  const process = processResult.status === "fulfilled" ? processResult.value : undefined;
  const records =
    statusResult.status === "fulfilled" && Array.isArray(statusResult.value?.records) ? statusResult.value.records : [];

  const base = {
    session_id: sessionId,
    session_label: sessionLabel,
    window_id: windowId,
    window_label: windowLabel,
    block_id: block.block_id,
    block_label: block.label || block.flavor || block.creator_name || "Terminal",
    creator_name: block.creator_name,
    flavor: block.flavor,
    host_id: block.host_id,
    owner: block.owner ?? undefined,
  };

  if (records.length === 0) {
    return [
      {
        ...base,
        id: `${sessionId}:${windowId}:${block.block_id}:process`,
        process,
      },
    ];
  }

  return withoutIdlessStatusEchoes(records).map((status) => ({
    ...base,
    id: `${sessionId}:${windowId}:${block.block_id}:${status.id || "root"}`,
    status,
    process,
  }));
}

async function loadWindowActivities(
  sessionId: string,
  sessionLabel: string,
  window: RexViewWindow,
): Promise<RexActivity[]> {
  const windowId = typeof window.window_id === "string" ? window.window_id : "";

  if (!windowId) {
    return [];
  }

  const windowLabel = window.label || "Window";
  const blocks: RexPlacedBlock[] = [];
  const seenBlockIds = new Set<string>();

  for (const layer of Array.isArray(window.layers) ? window.layers : []) {
    for (const block of Array.isArray(layer?.blocks) ? layer.blocks : []) {
      const blockId = block?.block_id;

      if (typeof blockId !== "string" || !blockId || seenBlockIds.has(blockId)) {
        continue;
      }

      seenBlockIds.add(blockId);
      blocks.push({ ...block, block_id: blockId });
    }
  }

  const activityGroups = await Promise.all(
    blocks.map((block) => loadBlockActivities(sessionId, sessionLabel, windowId, windowLabel, block)),
  );

  return activityGroups.flat();
}

async function loadSessionActivities(session: RexSession): Promise<RexActivity[]> {
  const view = await callSessionApi<RexView>(session.session_id, "session.view", {
    session_id: session.session_id,
  });
  const sessionLabel = view.label || session.label;
  const windows = Array.isArray(view.windows) ? view.windows : [];
  const activityGroups = await Promise.all(
    windows.map((window) => loadWindowActivities(session.session_id, sessionLabel, window)),
  );

  return activityGroups.flat();
}

/** A session whose activity could not be loaded, while other sessions still loaded. */
export interface RexActivityLoadFailure {
  session_id: string;
  session_label: string;
  message: string;
}

export interface RexActivityLoadResult {
  activities: RexActivity[];
  failedSessions: RexActivityLoadFailure[];
}

/**
 * Lists every placed block in every session, with one activity per reported
 * program status. Blocks with no reported status get a fallback activity so
 * idle panes still appear. Status and process reads fail independently, and a
 * session that closes mid-load is reported separately instead of hiding the
 * sessions that loaded.
 */
export async function loadActivities(): Promise<RexActivityLoadResult> {
  const sessions = await listSessions();
  const results = await Promise.allSettled(sessions.map(loadSessionActivities));
  const activities: RexActivity[] = [];
  const failedSessions: RexActivityLoadFailure[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      activities.push(...result.value);
      return;
    }

    const session = sessions[index];
    failedSessions.push({
      session_id: session.session_id,
      session_label: session.label,
      message: describeError(result.reason),
    });
  });

  return { activities, failedSessions };
}

/**
 * Focuses the activity's block: first telling the Rex app to show the session
 * and window, then focusing the exact block on the server.
 */
export async function focusActivity(activity: RexActivity): Promise<void> {
  await selectSession(undefined, activity.session_id, activity.window_id);

  await callSessionApi(activity.session_id, "session.focus_block", {
    session_id: activity.session_id,
    block_id: activity.block_id,
  });
}
