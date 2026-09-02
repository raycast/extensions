import { dirname } from "node:path";

import { ParallelsHostError, createMacOSParallelsHost, type ParallelsHost } from "./internal/parallels-host";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DEFAULT_START_TIMEOUT_MS = 30_000;
const DEFAULT_POLL_INTERVAL_MS = 250;

export type VMState = "running" | "suspended" | "stopped" | "transitioning" | "unknown";

export type RegisteredVM = Readonly<{
  id: string;
  name: string;
  home: string;
  state: VMState;
  os?: string;
  description?: string;
}>;

export type OpenOutcome = Readonly<{
  vm: RegisteredVM;
  action: "switched" | "resumed-and-switched" | "started-and-switched";
}>;

export type VMControl = "suspend" | "reset" | "force-stop" | "start-then-force-stop";

export type RegisteredVMErrorCode =
  | "registry-unavailable"
  | "registry-invalid"
  | "duplicate-vm-id"
  | "invalid-vm-id"
  | "vm-not-found"
  | "vm-query-empty"
  | "vm-query-not-found"
  | "vm-query-ambiguous"
  | "focus-proxy-failed"
  | "focus-proxy-ambiguous"
  | "start-failed"
  | "start-timeout"
  | "activation-failed"
  | "invalid-control"
  | "control-failed";

export class RegisteredVMError extends Error {
  readonly code: RegisteredVMErrorCode;
  readonly cause: unknown;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: RegisteredVMErrorCode,
    message: string,
    options: Readonly<{
      cause?: unknown;
      details?: Readonly<Record<string, unknown>>;
    }> = {},
  ) {
    super(message);
    this.name = "RegisteredVMError";
    this.code = code;
    this.cause = options.cause;
    this.details = options.details ?? {};
  }
}

export interface RegisteredVMs {
  snapshot(): Promise<readonly RegisteredVM[]>;
  openOrSwitch(id: string): Promise<OpenOutcome>;
  control(id: string, action: VMControl): Promise<void>;
}

export type RegisteredVMsOptions = Readonly<{
  startTimeoutMs?: number;
  pollIntervalMs?: number;
}>;

function registryError(message: string, cause?: unknown): RegisteredVMError {
  return new RegisteredVMError("registry-invalid", message, { cause });
}

function normalizeVMID(rawID: string): string | null {
  let value = rawID.trim();
  const opensBrace = value.startsWith("{");
  const closesBrace = value.endsWith("}");
  if (opensBrace || closesBrace) {
    if (!opensBrace || !closesBrace) return null;
    value = value.slice(1, -1);
  }
  const normalized = value.toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function requireVMID(rawID: string): string {
  const normalized = normalizeVMID(rawID);
  if (normalized) return normalized;
  throw new RegisteredVMError("invalid-vm-id", `Invalid Parallels VM UUID: ${rawID}`, {
    details: { vmID: rawID },
  });
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function readRequiredString(record: Record<string, unknown>, key: string, index: number): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw registryError(`Registered VM record ${index} has no valid ${key}`);
  }
  return value;
}

function readOptionalString(record: Record<string, unknown>, key: string, index: number): string | undefined {
  const value = record[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw registryError(`Registered VM record ${index} has an invalid ${key}`);
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function isTemplate(value: unknown, index: number): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 0) return false;
    if (value === 1) return true;
    throw registryError(`Registered VM record ${index} has an invalid Template marker`);
  }
  if (typeof value !== "string") {
    throw registryError(`Registered VM record ${index} has an invalid Template marker`);
  }
  switch (value.trim().toLowerCase()) {
    case "":
    case "0":
    case "false":
    case "no":
      return false;
    case "1":
    case "true":
    case "yes":
      return true;
    default:
      throw registryError(`Registered VM record ${index} has an invalid Template marker`);
  }
}

function parseState(value: unknown, index: number): VMState {
  if (value === undefined || value === null || value === "") return "unknown";
  if (typeof value !== "string") {
    throw registryError(`Registered VM record ${index} has an invalid State`);
  }
  switch (value.trim().toLowerCase()) {
    case "running":
      return "running";
    case "suspended":
      return "suspended";
    case "stopped":
      return "stopped";
    case "resuming":
    case "starting":
    case "stopping":
    case "suspending":
    case "resetting":
      return "transitioning";
    default:
      return "unknown";
  }
}

function parseRegisteredVM(record: Record<string, unknown>, index: number): RegisteredVM | null {
  const rawType = record.Type;
  if (rawType !== undefined && rawType !== null) {
    if (typeof rawType !== "string") {
      throw registryError(`Registered VM record ${index} has an invalid Type`);
    }
    if (rawType.trim().toUpperCase() !== "VM") return null;
  }
  if (isTemplate(record.Template, index)) return null;

  const rawID = readRequiredString(record, "ID", index);
  const id = normalizeVMID(rawID);
  if (!id) throw registryError(`Registered VM record ${index} has an invalid UUID: ${rawID}`);

  const name = normalizeName(readRequiredString(record, "Name", index));
  let home: string;
  if (typeof record.Home === "string" && record.Home.trim().length > 0) {
    home = record.Home.trim().replace(/\/+$/, "") || "/";
  } else if (typeof record["Home path"] === "string" && record["Home path"].trim().length > 0) {
    home = dirname(record["Home path"].trim());
  } else {
    throw registryError(`Registered VM record ${index} has no valid Home or Home path`);
  }

  return Object.freeze({
    id,
    name,
    home,
    state: parseState(record.State, index),
    os: readOptionalString(record, "OS", index),
    description: readOptionalString(record, "Description", index),
  });
}

function compareVMs(left: RegisteredVM, right: RegisteredVM): number {
  const leftName = left.name.toLowerCase();
  const rightName = right.name.toLowerCase();
  if (leftName < rightName) return -1;
  if (leftName > rightName) return 1;
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function parseRegistry(payload: string): readonly RegisteredVM[] {
  let raw: unknown;
  try {
    raw = JSON.parse(payload);
  } catch (cause) {
    throw registryError("prlctl returned invalid JSON", cause);
  }
  if (!Array.isArray(raw)) throw registryError("prlctl JSON root is not an array");

  const byID = new Map<string, RegisteredVM>();
  raw.forEach((value, index) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw registryError(`Registered VM record ${index} is not an object`);
    }
    const vm = parseRegisteredVM(value as Record<string, unknown>, index);
    if (!vm) return;
    if (byID.has(vm.id)) {
      throw new RegisteredVMError("duplicate-vm-id", `prlctl returned duplicate VM UUID: ${vm.id}`, {
        details: { vmID: vm.id },
      });
    }
    byID.set(vm.id, vm);
  });

  return Object.freeze([...byID.values()].sort(compareVMs));
}

function normalizedQuery(value: string): string {
  return normalizeName(value).toLowerCase();
}

export function resolveVMQuery(vms: readonly RegisteredVM[], query: string): RegisteredVM {
  const normalizedName = normalizedQuery(query);
  if (!normalizedName) {
    throw new RegisteredVMError("vm-query-empty", "Virtual machine name or UUID is required");
  }

  const id = normalizeVMID(query);
  if (id) {
    const match = vms.find((vm) => vm.id === id);
    if (match) return match;
    throw new RegisteredVMError("vm-query-not-found", `No registered virtual machine has UUID ${id}`, {
      details: { query, vmID: id },
    });
  }

  const exactMatches = vms.filter((vm) => normalizedQuery(vm.name) === normalizedName);
  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1) {
    throw new RegisteredVMError(
      "vm-query-ambiguous",
      `More than one registered virtual machine is named “${query.trim()}”`,
      {
        details: {
          query,
          matches: exactMatches.map((vm) => ({ id: vm.id, name: vm.name })),
        },
      },
    );
  }

  const partialMatches = vms.filter((vm) => normalizedQuery(vm.name).includes(normalizedName));
  if (partialMatches.length === 1) return partialMatches[0];
  if (partialMatches.length === 0) {
    throw new RegisteredVMError("vm-query-not-found", `No registered virtual machine matches “${query.trim()}”`, {
      details: { query },
    });
  }
  throw new RegisteredVMError(
    "vm-query-ambiguous",
    `More than one registered virtual machine matches “${query.trim()}”`,
    {
      details: {
        query,
        matches: partialMatches.map((vm) => ({ id: vm.id, name: vm.name })),
      },
    },
  );
}

function validatedDuration(value: number | undefined, fallback: number, name: string): number {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved <= 0) {
    throw new RangeError(`${name} must be a positive finite number`);
  }
  return resolved;
}

function wrapHostError(error: unknown, fallbackCode: RegisteredVMErrorCode, message: string): RegisteredVMError {
  if (error instanceof RegisteredVMError) return error;
  if (error instanceof ParallelsHostError && error.code === "focus-proxy-ambiguous") {
    return new RegisteredVMError("focus-proxy-ambiguous", error.message, {
      cause: error,
      details: error.details,
    });
  }
  return new RegisteredVMError(fallbackCode, message, { cause: error });
}

function controlCommands(id: string, action: VMControl): readonly string[][] {
  switch (action) {
    case "suspend":
      return [["suspend", id]];
    case "reset":
      return [["reset", id]];
    case "force-stop":
      return [["stop", id, "--kill"]];
    case "start-then-force-stop":
      return [
        ["start", id],
        ["stop", id, "--kill"],
      ];
    default:
      throw new RegisteredVMError("invalid-control", `Unsupported virtual machine control: ${String(action)}`, {
        details: { action },
      });
  }
}

class RegisteredVMsModule implements RegisteredVMs {
  readonly #host: ParallelsHost;
  readonly #startTimeoutMs: number;
  readonly #pollIntervalMs: number;
  readonly #openOperations = new Map<string, Promise<OpenOutcome>>();

  constructor(host: ParallelsHost, options: RegisteredVMsOptions) {
    this.#host = host;
    this.#startTimeoutMs = validatedDuration(options.startTimeoutMs, DEFAULT_START_TIMEOUT_MS, "startTimeoutMs");
    this.#pollIntervalMs = validatedDuration(options.pollIntervalMs, DEFAULT_POLL_INTERVAL_MS, "pollIntervalMs");
  }

  async snapshot(): Promise<readonly RegisteredVM[]> {
    let payload: string;
    try {
      payload = await this.#host.registryJSON();
    } catch (error) {
      throw wrapHostError(error, "registry-unavailable", "Unable to read registered Parallels virtual machines");
    }
    return parseRegistry(payload);
  }

  openOrSwitch(rawID: string): Promise<OpenOutcome> {
    let id: string;
    try {
      id = requireVMID(rawID);
    } catch (error) {
      return Promise.reject(error);
    }

    const existing = this.#openOperations.get(id);
    if (existing) return existing;

    const operation = this.#performOpen(id).finally(() => {
      if (this.#openOperations.get(id) === operation) this.#openOperations.delete(id);
    });
    this.#openOperations.set(id, operation);
    return operation;
  }

  async control(rawID: string, action: VMControl): Promise<void> {
    const id = requireVMID(rawID);
    const commands = controlCommands(id, action);
    const vm = await this.#findByID(id);
    if (action === "start-then-force-stop" && vm.state !== "suspended") {
      throw new RegisteredVMError(
        "invalid-control",
        `Start Then Force Stop is only available while virtual machine “${vm.name}” is suspended`,
        { details: { action, state: vm.state, vmID: id } },
      );
    }
    try {
      for (const args of commands) await this.#host.runPrlctl(args);
    } catch (error) {
      const operation = action === "start-then-force-stop" ? "start and force stop" : action;
      throw wrapHostError(error, "control-failed", `Unable to ${operation} virtual machine “${vm.name}”`);
    }
  }

  async #findByID(id: string): Promise<RegisteredVM> {
    const vm = (await this.snapshot()).find((candidate) => candidate.id === id);
    if (vm) return vm;
    throw new RegisteredVMError(
      "vm-not-found",
      `Parallels no longer has a registered virtual machine with UUID ${id}`,
      {
        details: { vmID: id },
      },
    );
  }

  async #focusProxyPID(id: string): Promise<number | null> {
    try {
      return await this.#host.focusProxyPID(id);
    } catch (error) {
      throw wrapHostError(error, "focus-proxy-failed", `Unable to find the activation helper for VM ${id}`);
    }
  }

  async #performOpen(id: string): Promise<OpenOutcome> {
    const vm = await this.#findByID(id);
    let pid = await this.#focusProxyPID(id);
    let action: OpenOutcome["action"] = "switched";

    if (pid === null) {
      action = vm.state === "suspended" ? "resumed-and-switched" : "started-and-switched";
      try {
        await this.#host.openVMHome(vm.home);
      } catch (error) {
        throw wrapHostError(error, "start-failed", `Unable to start virtual machine “${vm.name}”`);
      }

      const deadline = this.#host.now() + this.#startTimeoutMs;
      while (pid === null) {
        const remaining = deadline - this.#host.now();
        if (remaining <= 0) {
          throw new RegisteredVMError(
            "start-timeout",
            `Timed out after ${this.#startTimeoutMs}ms waiting for virtual machine “${vm.name}”`,
            { details: { timeoutMs: this.#startTimeoutMs, vmID: id } },
          );
        }
        try {
          await this.#host.sleep(Math.min(this.#pollIntervalMs, remaining));
        } catch (error) {
          throw wrapHostError(error, "start-failed", `Unable to wait for virtual machine “${vm.name}”`);
        }
        pid = await this.#focusProxyPID(id);
      }
    }

    try {
      await this.#host.activate(pid);
    } catch (error) {
      throw wrapHostError(error, "activation-failed", `Unable to activate virtual machine “${vm.name}”`);
    }
    return Object.freeze({ vm, action });
  }
}

export function createRegisteredVMs(host: ParallelsHost, options: RegisteredVMsOptions = {}): RegisteredVMs {
  return new RegisteredVMsModule(host, options);
}

export const registeredVMs = createRegisteredVMs(createMacOSParallelsHost());
