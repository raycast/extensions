import { constants } from "node:fs";
import { access, realpath, stat } from "node:fs/promises";
import { createConnection, type Socket } from "node:net";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";

export type HcTarget = {
  kind: "hc";
  socketPath: string;
  hostCoreId: string;
  coreId: string;
  terminalId: string;
};
export type HcTerminal = {
  address: string;
  name?: string | null;
  labels: Record<string, string>;
  argv: string[];
  cwd: string;
  state: string;
  created_ms: number;
  pid?: number | null;
  foreground?: { pid: number; name: string; argv: string[]; cwd: string; [key: string]: unknown } | null;
  status?: {
    state: string;
    kind?: string | null;
    title?: string;
    msg?: string;
    app?: string;
    [key: string]: unknown;
  } | null;
  status_ms?: number | null;
  reported?: boolean;
  turn?: number;
  screen?: string;
  cols?: number;
  rows?: number;
  reason?: string | null;
  template?: string | null;
  keep?: boolean;
  [key: string]: unknown;
};
export type HcMachine = { id: string; name: string; state?: string; [key: string]: unknown };
export type HcCatalogue = { core: { id: string; name: string }; terminals: HcTerminal[]; machines: HcMachine[] };
export type HcEntry = { target: HcTarget; terminal: HcTerminal; machine: string; connected: boolean };

type RecordValue = Record<string, unknown>;
const MAX_LINE = 8 * 1024 * 1024;
const REQUIRED_METHODS = [
  "terminal.list",
  "terminal.get",
  "terminal.read",
  "terminal.send",
  "terminal.keys",
  "terminal.interrupt",
  "machine.list",
  "events.subscribe",
];
const READ_ONLY = new Set([
  "hello",
  "terminal.list",
  "terminal.get",
  "terminal.read",
  "machine.list",
  "events.subscribe",
  "server.status",
  "rpc.discover",
  "templates.list",
]);
const component = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(value);
const terminalId = (value: unknown): value is string =>
  typeof value === "string" && /^t[1-9][0-9bcdfghjkmnpqrstvwxyz]{0,7}$/.test(value);
const object = (value: unknown): value is RecordValue => !!value && typeof value === "object" && !Array.isArray(value);
const uint = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const text = (value: unknown): value is string => typeof value === "string";
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length <= 16_384 && value.every(text);
const nullable = (value: unknown, check: (value: unknown) => boolean) => value == null || check(value);

export class HcError extends Error {
  constructor(
    public readonly kind: string,
    message = "Herdr request failed. Refresh the connection before continuing.",
  ) {
    super(message);
    this.name = "HcError";
  }
}
function protocol(): never {
  throw new HcError("protocol", "Herdr returned an invalid or oversized response. Reconnect before continuing.");
}
function uncertain() {
  return new HcError(
    "unknown",
    "Delivery is uncertain. Inspect the latest terminal output before explicitly allowing another input; do not retry automatically.",
  );
}
function ioError(error: unknown): HcError {
  const code = object(error) ? error.code : undefined;
  return code === "EACCES" || code === "EPERM"
    ? new HcError("permissions", "Herdr socket access was denied. Check ownership and private directory permissions.")
    : code === "ENOENT"
      ? new HcError(
          "missing",
          "No existing Herdr socket was found. Open Herdr or set its exact Socket Path; discovery never starts a core.",
        )
      : new HcError("offline", "The existing Herdr core is offline or disconnected. Reconnect before continuing.");
}
function absolutePath(path: string): string {
  const expanded = path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
  if (!isAbsolute(expanded) || expanded.includes("\0"))
    throw new HcError("config", "Herdr Socket Path must be an absolute Unix path or start with ~/.");
  return expanded;
}

// Match HC v0.1.17's Unix endpoints without invoking its connect_or_start CLI.
// A custom config.toml socket is deliberately not guessed: set Socket Path explicitly.
export async function resolveHcSocket(override?: string): Promise<string> {
  if (override?.trim()) return absolutePath(override.trim());
  if (process.env.HC_SOCKET) return absolutePath(process.env.HC_SOCKET);
  const session = process.env.HC_SESSION?.trim() || "default";
  if (
    session === "." ||
    session === ".." ||
    /[/\\:*?"<>|]/.test(session) ||
    [...session].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  )
    throw new HcError("config", "HC_SESSION must be a valid single folder name.");
  let runtime = process.env.XDG_RUNTIME_DIR;
  if (!runtime && process.getuid) {
    const run = `/run/user/${process.getuid()}`;
    if (
      await stat(run).then(
        (info) => info.isDirectory(),
        () => false,
      )
    )
      runtime = run;
  }
  return runtime
    ? join(absolutePath(runtime), "herdr-core", `${session}.sock`)
    : join(
        absolutePath(process.env.XDG_STATE_HOME || join(homedir(), ".local", "state")),
        "herdr-core",
        session,
        `${session}.sock`,
      );
}

export async function resolveHcExecutable(): Promise<string | undefined> {
  const paths = [
    ...(process.env.PATH || "")
      .split(":")
      .filter(isAbsolute)
      .map((path) => join(path, "hc")),
    join(homedir(), ".local", "bin", "hc"),
    "/opt/homebrew/bin/hc",
    "/usr/local/bin/hc",
  ];
  for (const path of new Set(paths)) {
    try {
      if ((await stat(path)).isFile()) {
        await access(path, constants.X_OK);
        return path;
      }
    } catch {
      /* Static discovery only; no version/schema command or auto-start. */
    }
  }
}

async function privateSocket(path: string): Promise<string> {
  try {
    // Resolve symlinked socket/parent paths before checking the actual boundary.
    const resolved = await realpath(absolutePath(path));
    const [socket, parent] = await Promise.all([stat(resolved), stat(dirname(resolved))]);
    const uid = process.getuid?.();
    if (
      uid === undefined ||
      !socket.isSocket() ||
      socket.uid !== uid ||
      !parent.isDirectory() ||
      parent.uid !== uid ||
      (parent.mode & 0o077) !== 0
    )
      throw new HcError(
        "permissions",
        "Herdr must use a Unix socket owned by this user inside a private, user-owned directory (chmod 700).",
      );
    return resolved;
  } catch (error) {
    throw error instanceof HcError ? error : ioError(error);
  }
}

function coreInfo(value: unknown): { id: string; name: string } {
  if (!object(value) || !component(value.id) || !text(value.name) || !value.name || value.name.length > 1024)
    protocol();
  return { id: value.id, name: value.name };
}
function addressParts(address: string): { prefix?: string; id: string } | undefined {
  const parts = address.split("/");
  if (parts.length === 1 && terminalId(parts[0])) return { id: parts[0] };
  if (parts.length === 2 && component(parts[0]) && terminalId(parts[1])) return { prefix: parts[0], id: parts[1] };
}
function terminal(value: unknown): HcTerminal {
  if (
    !object(value) ||
    !text(value.address) ||
    !addressParts(value.address) ||
    !object(value.labels) ||
    Object.keys(value.labels).length > 4096 ||
    !Object.values(value.labels).every(text) ||
    !strings(value.argv) ||
    !text(value.cwd) ||
    !text(value.state) ||
    !uint(value.created_ms)
  )
    protocol();
  for (const key of ["name", "reason", "template"]) if (!nullable(value[key], text)) protocol();
  for (const key of ["pid", "status_ms", "turn", "cols", "rows"]) if (!nullable(value[key], uint)) protocol();
  for (const key of ["reported", "keep"]) if (!nullable(value[key], (v) => typeof v === "boolean")) protocol();
  if (!nullable(value.screen, text)) protocol();
  if (value.status != null) {
    if (!object(value.status) || !text(value.status.state)) protocol();
    for (const key of ["kind", "title", "msg", "app"]) if (!nullable(value.status[key], text)) protocol();
  }
  if (
    value.foreground != null &&
    (!object(value.foreground) ||
      !Number.isSafeInteger(value.foreground.pid) ||
      !text(value.foreground.name) ||
      !strings(value.foreground.argv) ||
      !text(value.foreground.cwd))
  )
    protocol();
  return value as HcTerminal;
}
function terminals(value: unknown): HcTerminal[] {
  if (!Array.isArray(value) || value.length > 16_384) protocol();
  return value.map(terminal);
}
function machines(value: unknown): HcMachine[] {
  if (!Array.isArray(value) || value.length > 4096) protocol();
  return value.map((machine) => {
    if (!object(machine) || !component(machine.id) || !component(machine.name) || !nullable(machine.state, text))
      protocol();
    return machine as HcMachine;
  });
}

export function hcEntries(catalogue: HcCatalogue, socketPath: string): HcEntry[] {
  const result: HcEntry[] = [];
  const seen = new Set<string>();
  for (const item of catalogue.terminals) {
    const parts = addressParts(item.address);
    if (!parts) continue;
    const local = !parts.prefix || parts.prefix === catalogue.core.id || parts.prefix === catalogue.core.name;
    const matches = catalogue.machines.filter((m) => m.id === parts.prefix || m.name === parts.prefix);
    // Never resolve an unpinned or ambiguous alias, nor accidentally route an alias collision locally.
    if (local ? matches.some((m) => m.id !== catalogue.core.id) : matches.length !== 1) continue;
    const owner = local ? catalogue.core : matches[0]!;
    if (!component(owner.id)) continue;
    const target: HcTarget = {
      kind: "hc",
      socketPath,
      hostCoreId: catalogue.core.id,
      coreId: owner.id,
      terminalId: parts.id,
    };
    const key = hcTargetKey(target);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      target,
      terminal: item,
      machine: owner.name,
      connected: local || (owner as HcMachine).state === "connected",
    });
  }
  return result;
}
export function hcTargetKey(target: HcTarget): string {
  return JSON.stringify(["hc", target.socketPath, target.hostCoreId, target.coreId, target.terminalId]);
}
export function hcProgramFingerprint(item: HcTerminal): string {
  // Observations, not a program UUID. Status/turn/screen are reviewed separately by the UI.
  return JSON.stringify([
    item.address.split("/").at(-1),
    item.created_ms,
    item.pid ?? null,
    item.argv,
    item.cwd,
    item.state,
    item.reason ?? null,
    item.foreground ? [item.foreground.pid, item.foreground.name, item.foreground.argv, item.foreground.cwd] : null,
  ]);
}

function rpcError(value: unknown, mutation: boolean): HcError {
  if (
    !object(value) ||
    !Number.isSafeInteger(value.code) ||
    !text(value.message) ||
    !object(value.data) ||
    !text(value.data.kind) ||
    !/^[a-z_]{1,64}$/.test(value.data.kind)
  )
    protocol();
  const kind = value.data.kind;
  if (kind === "blocked")
    return new HcError("blocked", "The terminal is blocked. Review its current prompt before responding.");
  if (["status_mismatch", "finished"].includes(kind))
    return new HcError("changed", "The terminal changed. Refresh and review the current program before continuing.");
  if (["not_found", "machine_unknown"].includes(kind))
    return new HcError("missing", "This exact terminal or owning core is no longer available.");
  if (["unsupported_generation", "incompatible", "unknown_method", "needs_update"].includes(kind))
    return new HcError("incompatible", "This Herdr core does not support the required protocol or method.");
  if (["denied", "permissions"].includes(kind)) return new HcError("permissions", "Herdr denied this operation.");
  if (["invalid_params", "invalid_request", "usage", "config"].includes(kind))
    return new HcError("protocol", "Herdr rejected the request parameters. No automatic retry was made.");
  return mutation
    ? uncertain()
    : new HcError("offline", "Herdr could not complete this request. Check the core and machine connection.");
}

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  mutation: boolean;
};
class RpcConnection {
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private fragments: Buffer[] = [];
  private bytes = 0;
  private failure?: HcError;
  onNotification?: (method: string, params: RecordValue) => void;
  onDisconnect?: (error: HcError) => void;

  private constructor(private socket: Socket) {
    socket.on("data", (chunk: Buffer) => {
      try {
        let offset = 0;
        while (offset < chunk.length && !this.failure) {
          const newline = chunk.indexOf(10, offset);
          const end = newline < 0 ? chunk.length : newline;
          const part = chunk.subarray(offset, end);
          this.bytes += part.length;
          if (this.bytes > MAX_LINE) protocol();
          this.fragments.push(part);
          if (newline < 0) break;
          const line = Buffer.concat(this.fragments, this.bytes);
          this.fragments = [];
          this.bytes = 0;
          if (line.length) this.receive(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(line)));
          offset = newline + 1;
        }
      } catch {
        this.close(
          new HcError("protocol", "Herdr returned an invalid or oversized response. Reconnect before continuing."),
        );
      }
    });
    socket.on("error", (error) => this.close(ioError(error)));
    socket.on("end", () =>
      this.close(this.bytes ? new HcError("protocol", "Herdr disconnected during a response.") : ioError(undefined)),
    );
    socket.on("close", () => this.close(ioError(undefined)));
  }
  static async connect(path: string): Promise<RpcConnection> {
    const socket = createConnection({ path });
    const connection = new RpcConnection(socket);
    await new Promise<void>((resolve, reject) => {
      const done = (error?: HcError) => {
        clearTimeout(timer);
        socket.off("connect", connected);
        socket.off("close", closed);
        connection.onDisconnect = undefined;
        if (error) reject(error);
        else resolve();
      };
      const connected = () => done();
      const closed = () => done(connection.failure || ioError(undefined));
      const timer = setTimeout(
        () => connection.close(new HcError("offline", "Timed out connecting to the existing Herdr socket.")),
        5_000,
      );
      socket.once("connect", connected);
      socket.once("close", closed);
    });
    return connection;
  }
  request(method: string, params: object = {}): Promise<unknown> {
    if (this.failure) return Promise.reject(this.failure);
    if (this.pending.size >= 64) return Promise.reject(new HcError("busy", "Too many Herdr requests are pending."));
    const mutation = !READ_ONLY.has(method);
    const id = this.nextId++;
    let body: string;
    try {
      body = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
      if (Buffer.byteLength(body) > 1_048_576) throw new Error();
    } catch {
      return Promise.reject(new HcError("protocol", "Herdr request is invalid or too large. Nothing was sent."));
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => this.close(new HcError("offline", "Herdr request timed out. Reconnect before continuing.")),
        mutation ? 30_000 : 5_000,
      );
      this.pending.set(id, { resolve, reject, timer, mutation });
      try {
        this.socket.write(body);
      } catch {
        this.close(ioError(undefined));
      }
    });
  }
  private receive(value: unknown) {
    if (!object(value) || value.jsonrpc !== "2.0") protocol();
    if (!Object.hasOwn(value, "id")) {
      if (
        !this.onNotification ||
        Object.hasOwn(value, "result") ||
        Object.hasOwn(value, "error") ||
        !text(value.method) ||
        !object(value.params)
      )
        protocol();
      this.onNotification(value.method, value.params);
      return;
    }
    if (!Number.isSafeInteger(value.id) || Object.hasOwn(value, "result") === Object.hasOwn(value, "error")) protocol();
    const pending = this.pending.get(value.id as number);
    if (!pending) protocol();
    // Validate before removing: malformed mutation errors must retain uncertain delivery.
    const error = Object.hasOwn(value, "error") ? rpcError(value.error, pending.mutation) : undefined;
    this.pending.delete(value.id as number);
    clearTimeout(pending.timer);
    if (error) pending.reject(error);
    else pending.resolve(value.result);
  }
  close(error = ioError(undefined)) {
    if (this.failure) return;
    this.failure = error;
    this.fragments = [];
    this.bytes = 0;
    this.socket.destroy();
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(pending.mutation ? uncertain() : error);
    }
    this.pending.clear();
    const disconnected = this.onDisconnect;
    this.onDisconnect = undefined;
    this.onNotification = undefined;
    disconnected?.(error);
  }
}

function hello(value: unknown) {
  if (
    !object(value) ||
    value.generation !== 1 ||
    value.framed !== false ||
    !strings(value.methods) ||
    !strings(value.features)
  )
    throw new HcError("incompatible", "Herdr must support generation 1 NDJSON RPC.");
  const core = coreInfo(value.core);
  const methods = new Set(value.methods);
  const features = new Set(value.features);
  if (
    REQUIRED_METHODS.some((method) => !methods.has(method)) ||
    !["events", "status"].every((feature) => features.has(feature))
  )
    throw new HcError("incompatible", "Herdr is missing required terminal, status, or event capabilities.");
  return { core, methods };
}
function result(method: string, value: unknown): unknown {
  if (method === "terminal.get") return terminal(value);
  if (method === "terminal.list") {
    if (!object(value)) protocol();
    terminals(value.terminals);
    if (Object.hasOwn(value, "machines")) machines(value.machines);
  } else if (method === "machine.list") {
    if (!object(value)) protocol();
    machines(value.machines);
  } else if (method === "terminal.read") {
    if (
      !object(value) ||
      !text(value.text) ||
      typeof value.complete !== "boolean" ||
      !text(value.how) ||
      !nullable(value.why, text)
    )
      protocol();
    // HC may omit why or emit null; the public convenience method promises an optional string.
    return {
      text: value.text,
      complete: value.complete,
      how: value.how,
      ...(text(value.why) ? { why: value.why } : {}),
    };
  } else if (method === "terminal.send" || method === "terminal.keys") {
    if (
      !object(value) ||
      !nullable(value.status, text) ||
      !uint(value.turn) ||
      (method === "terminal.send" && !nullable(value.started, (v) => typeof v === "boolean"))
    )
      protocol();
  } else if (method === "terminal.interrupt") {
    if (!object(value) || !text(value.outcome) || !text(value.key)) protocol();
  }
  return value;
}

export class HcClient {
  private observers = new Set<RpcConnection>();
  private closed = false;
  private constructor(
    readonly socketPath: string,
    readonly core: { id: string; name: string },
    readonly methods: Set<string>,
    private rpc: RpcConnection,
  ) {}
  static async connect(socketPath?: string): Promise<HcClient> {
    const path = await privateSocket(await resolveHcSocket(socketPath));
    const rpc = await RpcConnection.connect(path);
    try {
      const handshake = hello(await rpc.request("hello", { generation: 1, framed: false }));
      return new HcClient(path, handshake.core, handshake.methods, rpc);
    } catch (error) {
      rpc.close();
      throw error;
    }
  }
  async request<T = unknown>(method: string, params: object = {}): Promise<T> {
    if (this.closed) throw new HcError("offline", "Herdr client is closed. Reconnect before continuing.");
    if (!this.methods.has(method)) throw new HcError("incompatible", "This Herdr core does not support that method.");
    if (!object(params)) throw new HcError("protocol", "Herdr parameters must be an object. Nothing was sent.");
    if (["terminal.send", "terminal.keys", "terminal.interrupt"].includes(method)) {
      const parts = text(params.terminal) ? addressParts(params.terminal) : undefined;
      if (!parts?.prefix)
        throw new HcError(
          "changed",
          "Terminal input requires a permanent owning-core ID and terminal ID. Nothing was sent.",
        );
      const ownerId = parts.prefix;
      if (ownerId !== this.core.id) {
        const { machines: table } = await this.request<{ machines: HcMachine[] }>("machine.list");
        const owners = table.filter((machine) => machine.id === ownerId);
        if (
          ownerId === this.core.name ||
          owners.length !== 1 ||
          table.some((machine) => machine.name === ownerId && machine.id !== ownerId)
        )
          throw new HcError(
            "changed",
            "The permanent owning core is no longer uniquely pinned. Refresh targets before sending input.",
          );
        if (owners[0]!.state !== "connected")
          throw new HcError("offline", "The owning Herdr machine is not connected. Nothing was sent.");
      }
    }
    const value = await this.rpc.request(method, params);
    try {
      return result(method, value) as T;
    } catch (error) {
      this.rpc.close(new HcError("protocol", "Herdr returned an invalid response. Reconnect before continuing."));
      throw READ_ONLY.has(method) ? error : uncertain();
    }
  }
  async catalogue(): Promise<HcCatalogue> {
    // Prefer the listing's pinned table; HC omits it when there are no configured remotes.
    const listing = await this.request<{ terminals: HcTerminal[]; machines?: HcMachine[] }>("terminal.list");
    const table = listing.machines ?? (await this.request<{ machines: HcMachine[] }>("machine.list")).machines;
    return { core: this.core, terminals: listing.terminals, machines: table };
  }
  private address(target: HcTarget): string {
    if (
      target.kind !== "hc" ||
      target.hostCoreId !== this.core.id ||
      target.socketPath !== this.socketPath ||
      !component(target.coreId) ||
      !terminalId(target.terminalId)
    )
      throw new HcError("changed", "The Herdr connection or target identity changed. Reopen this exact terminal.");
    return `${target.coreId}/${target.terminalId}`;
  }
  async get(target: HcTarget): Promise<HcTerminal> {
    const value = await this.request<HcTerminal>("terminal.get", { terminal: this.address(target) });
    // Forwarded records use the host's current machine alias. Verify it against a fresh pinned table.
    const table =
      target.coreId === this.core.id ? [] : (await this.request<{ machines: HcMachine[] }>("machine.list")).machines;
    const entries = hcEntries({ core: this.core, terminals: [value], machines: table }, this.socketPath);
    if (!entries.some((entry) => hcTargetKey(entry.target) === hcTargetKey(target)))
      throw new HcError("changed", "The terminal's owning core changed. Refresh and review its identity.");
    return value;
  }
  read(target: HcTarget, lines = 0): Promise<{ text: string; complete: boolean; how: string; why?: string }> {
    if (!uint(lines) || lines > 100_000)
      return Promise.reject(new HcError("protocol", "History lines must be between 0 and 100000."));
    return this.request("terminal.read", { terminal: this.address(target), lines });
  }
  async observe(
    onChange: (event?: { type: string; terminal?: string }) => void,
    onDisconnect: (error: Error) => void,
  ): Promise<() => void> {
    if (this.closed) throw new HcError("offline", "Herdr client is closed.");
    const eventRpc = await RpcConnection.connect(await privateSocket(this.socketPath));
    if (this.closed) {
      eventRpc.close();
      throw new HcError("offline", "Herdr client is closed.");
    }
    this.observers.add(eventRpc);
    let stopped = false;
    let ready = false;
    let seq = -1;
    const queued: [string, RecordValue][] = [];
    const stop = () => {
      stopped = true;
      this.observers.delete(eventRpc);
      eventRpc.onDisconnect = undefined;
      eventRpc.close();
    };
    const notify = (event: { type: string; terminal?: string }) => {
      if (!stopped) onChange(event);
    };
    const snapshot = (value: unknown) => {
      if (!object(value) || !uint(value.seq)) protocol();
      terminals(value.terminals);
      seq = value.seq;
    };
    const event = (method: string, params: RecordValue) => {
      if (!uint(params.seq)) protocol();
      if (method === "missed") {
        snapshot(params);
        notify({ type: "missed" });
      } else if (method === "event") {
        if (
          !text(params.type) ||
          !object(params.data) ||
          (params.type !== "doc" && (!text(params.terminal) || !addressParts(params.terminal)))
        )
          protocol();
        if (params.seq <= seq) return;
        seq = params.seq; // Filtered streams may skip global sequences; never infer a gap.
        notify({ type: params.type, ...(text(params.terminal) ? { terminal: params.terminal } : {}) });
      } else if (method !== "heartbeat") protocol();
    };
    eventRpc.onNotification = (method, params) => {
      if (ready) event(method, params);
      else {
        if (queued.length >= 1024) protocol();
        queued.push([method, params]);
      }
    };
    eventRpc.onDisconnect = (error) => {
      this.observers.delete(eventRpc);
      if (!stopped) {
        stopped = true;
        onDisconnect(error);
      }
    };
    try {
      const handshake = hello(await eventRpc.request("hello", { generation: 1, framed: false }));
      if (handshake.core.id !== this.core.id)
        throw new HcError(
          "changed",
          "A different Herdr core answered the event connection. Reconnect and review targets.",
        );
      snapshot(await eventRpc.request("events.subscribe", {}));
      if (stopped) throw new HcError("offline", "Herdr event connection closed during subscription.");
      ready = true;
      // ponytail: events invalidate a fresh catalogue, not a second patch store; add a reducer only if refetch cost matters.
      notify({ type: "snapshot" });
      for (const [method, params] of queued) event(method, params);
      queued.length = 0;
      return stop;
    } catch (error) {
      stop();
      throw error;
    }
  }
  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const eventRpc of this.observers) {
      eventRpc.onDisconnect = undefined;
      eventRpc.close();
    }
    this.observers.clear();
    this.rpc.close();
  }
}
