import { spawn } from "child_process";

import type { AdapterStatus, AuthFieldType, AuthRequirements, ItemAvailability, VaultItem } from "../types";

export const EXTERNAL_PROTOCOL_VERSION = 1;
export const EXTERNAL_ADAPTER_TIMEOUT_MS = 30_000;
export const EXTERNAL_ADAPTER_MAX_BUFFER = 10 * 1024 * 1024;

export const EXTERNAL_ADAPTER_METHODS = [
  "isAvailable",
  "listItems",
  "searchItems",
  "getPassword",
  "getUsername",
  "getEmail",
  "getTotp",
  "getUrl",
  "getItemAvailability",
  "openInManager",
  "getAuthRequirements",
  "authenticate",
  "lockSession",
] as const;

export type ExternalAdapterMethod = (typeof EXTERNAL_ADAPTER_METHODS)[number];

export const OPTIONAL_EXTERNAL_CAPABILITIES = [
  "listItems",
  "getUrl",
  "openInManager",
  "getItemAvailability",
  "getAuthRequirements",
  "authenticate",
] as const;

export const STATELESS_EXTERNAL_METHODS: readonly ExternalAdapterMethod[] = ["isAvailable", "getAuthRequirements"];

export type OptionalExternalCapability = (typeof OPTIONAL_EXTERNAL_CAPABILITIES)[number];

export interface ExternalAdapterRequest {
  protocolVersion: number;
  id?: string;
  method: ExternalAdapterMethod;
  params?: Record<string, unknown>;
}

export interface ExternalAdapterSuccessResponse {
  ok: true;
  id?: string;
  result: unknown;
}

export interface ExternalAdapterErrorResponse {
  ok: false;
  id?: string;
  error: { message: string };
}

export type ExternalAdapterResponse = ExternalAdapterSuccessResponse | ExternalAdapterErrorResponse;

export interface IsAvailableResult {
  status: AdapterStatus;
}

export interface ItemsResult {
  items: VaultItem[];
}

export interface ValueResult {
  value?: string;
}

export interface ResolvedExternalCommand {
  executable: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
}

export class ExternalAdapterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalAdapterError";
  }
}

export function parseExternalMessage(line: string): ExternalAdapterResponse {
  const trimmed = line.trim();
  if (!trimmed) {
    throw new ExternalAdapterError("External adapter returned empty output");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    throw new ExternalAdapterError(`External adapter returned invalid JSON: ${trimmed.slice(0, 200)}`);
  }

  if (typeof parsed !== "object" || parsed === null || !("ok" in parsed)) {
    throw new ExternalAdapterError("External adapter response must include an ok field");
  }

  return parsed as ExternalAdapterResponse;
}

export function parseExternalResponse(stdout: string): ExternalAdapterSuccessResponse {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new ExternalAdapterError("External adapter returned empty output");
  }

  const line = trimmed.split("\n").find((entry) => entry.trim().startsWith("{"));
  if (!line) {
    throw new ExternalAdapterError(`External adapter returned non-JSON output: ${trimmed.slice(0, 200)}`);
  }

  const response = parseExternalMessage(line);
  if (!response.ok) {
    const message =
      "error" in response && typeof response.error?.message === "string"
        ? response.error.message
        : "External adapter reported an error";
    throw new ExternalAdapterError(message);
  }

  return response;
}

async function runExternalProcess(
  command: ResolvedExternalCommand,
  input: string,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command.executable, command.args, {
      cwd: command.cwd,
      env: { ...process.env, ...command.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new ExternalAdapterError(`External adapter timed out after ${EXTERNAL_ADAPTER_TIMEOUT_MS}ms`));
      }
    }, EXTERNAL_ADAPTER_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
      if (stdout.length > EXTERNAL_ADAPTER_MAX_BUFFER) {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          child.kill();
          reject(new ExternalAdapterError("External adapter output exceeded max buffer"));
        }
      }
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);

      if (code !== 0 && !stdout.trim()) {
        reject(new ExternalAdapterError(stderr.trim() || `External adapter exited with code ${code ?? "unknown"}`));
        return;
      }

      resolve({ stdout, stderr });
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

export async function invokeExternalAdapter(
  command: ResolvedExternalCommand,
  method: ExternalAdapterMethod,
  params: Record<string, unknown> = {},
): Promise<unknown> {
  const request: ExternalAdapterRequest = {
    protocolVersion: EXTERNAL_PROTOCOL_VERSION,
    method,
    params,
  };

  const { stdout, stderr } = await runExternalProcess(command, `${JSON.stringify(request)}\n`);

  if (stderr?.trim() && !stdout?.trim()) {
    throw new ExternalAdapterError(stderr.trim());
  }

  const response = parseExternalResponse(stdout);
  return response.result;
}

export function normalizeVaultItems(items: VaultItem[], managerId: string): VaultItem[] {
  return items.map((item) => ({
    ...item,
    managerId,
  }));
}

export function assertIsAvailableResult(result: unknown): AdapterStatus {
  if (typeof result !== "object" || result === null || !("status" in result)) {
    throw new ExternalAdapterError("isAvailable result must include a status object");
  }

  const status = (result as IsAvailableResult).status;
  if (status.ok === true) {
    return { ok: true };
  }

  if (status.ok === false && typeof status.reason === "string") {
    return {
      ok: false,
      reason: status.reason,
      ...(status.needsAuth === true ? { needsAuth: true } : {}),
    };
  }

  throw new ExternalAdapterError("isAvailable status must be { ok: true } or { ok: false, reason: string }");
}

const AUTH_FIELD_TYPES: readonly AuthFieldType[] = ["password", "pin", "text"];

export function assertAuthRequirementsResult(result: unknown): AuthRequirements {
  if (typeof result !== "object" || result === null || !("requirements" in result)) {
    throw new ExternalAdapterError("getAuthRequirements result must include a requirements object");
  }

  const requirements = (result as { requirements: AuthRequirements }).requirements;
  if (typeof requirements !== "object" || requirements === null || !Array.isArray(requirements.fields)) {
    throw new ExternalAdapterError("requirements.fields must be an array");
  }

  for (const field of requirements.fields) {
    if (!field || typeof field.id !== "string" || typeof field.label !== "string") {
      throw new ExternalAdapterError("Each auth field must include id and label strings");
    }

    if (!AUTH_FIELD_TYPES.includes(field.type)) {
      throw new ExternalAdapterError(`Unsupported auth field type: ${String(field.type)}`);
    }
  }

  return requirements;
}

export function assertItemsResult(result: unknown): VaultItem[] {
  if (typeof result !== "object" || result === null || !("items" in result)) {
    throw new ExternalAdapterError("Result must include an items array");
  }

  const items = (result as ItemsResult).items;
  if (!Array.isArray(items)) {
    throw new ExternalAdapterError("Result items must be an array");
  }

  return items;
}

export function assertValueResult(result: unknown): string | undefined {
  if (typeof result !== "object" || result === null) {
    throw new ExternalAdapterError("Result must be an object with an optional value field");
  }

  const value = (result as ValueResult).value;
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ExternalAdapterError("Result value must be a string when provided");
  }

  return value;
}

export function assertItemAvailabilityResult(result: unknown): ItemAvailability {
  if (typeof result !== "object" || result === null) {
    throw new ExternalAdapterError("getItemAvailability result must be an object");
  }

  const availability = result as ItemAvailability;
  for (const key of ["hasUrl", "hasEmail", "hasUsername", "hasTotp", "hasPassword"] as const) {
    if (typeof availability[key] !== "boolean") {
      throw new ExternalAdapterError(`getItemAvailability result must include boolean ${key}`);
    }
  }

  return availability;
}
