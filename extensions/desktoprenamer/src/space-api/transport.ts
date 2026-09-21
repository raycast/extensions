import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { runAppleScript } from "@raycast/utils";
import {
  DESKTOP_RENAMER_JSON_RPC_VERSION,
  MAX_STRUCTURED_PAYLOAD_BYTES,
  OPERATION_REQUEST_TIMEOUT_MS,
  READ_REQUEST_TIMEOUT_MS,
  SPACE_API_ERROR_CODES,
  SPACE_API_METHOD_DEFINITIONS,
  SPACE_API_WINDOW_ACTIONS,
  STRUCTURED_READ_METHODS,
  SpaceAPIProtocolError,
  type SpaceAPIInfo,
  type SpaceAPINamespace,
  type SpaceAPIMethod,
  type SpaceAPIMethodArguments,
  type SpaceAPIMethodResults,
  type SpaceAPIParameterKind,
  type SpaceAPIParameters,
  type SpaceAPIOperationResult,
} from "./contract";
import {
  decodeStructuredRPCResponse,
  isReadSpaceAPIMethod,
  isRecord,
  parseAPIInfo,
  parseSpaceRecord,
  parseSnapshot,
  parseWindowsSnapshot,
  protocolError,
  requiredString,
  validateStructuredResult,
} from "./codec";
import {
  parseLegacySpaceRecords,
  parseLegacySpaceSnapshotResult,
  parseLegacyWindowsSnapshot,
  runLegacySpaceAPICommand,
  runLegacySpaceAPICommandWithCompatibility,
} from "./legacy";
import { makeAppleScriptForMethod } from "./script";
import { makeStructuredSpaceAPIJXA } from "./jxa";
import {
  communicationMethod,
  checkDesktopRenamerRunning,
  handleDesktopRenamerError,
  requireDesktopRenamerInstalled,
} from "./runtime";

const execFileAsync = promisify(execFile);
let structuredAPIInfoLookup: Promise<SpaceAPIInfo> | null = null;
let structuredAPIMaxPayloadBytes = MAX_STRUCTURED_PAYLOAD_BYTES;
let structuredAPINamespace: SpaceAPINamespace | null = null;

export interface DesktopRenamerRequestOptions {
  showErrorToast?: boolean;
}

export async function runDesktopRenamerScript(
  scriptContent: string,
  errorMessage = "Is DesktopRenamer running?",
  options: DesktopRenamerRequestOptions = {},
) {
  try {
    const method = communicationMethod();
    await requireDesktopRenamerInstalled();

    if (method === "applescript") {
      const isRunning = await checkDesktopRenamerRunning();
      if (!isRunning) {
        throw new Error("NotRunning");
      }
    }
    if (method !== "applescript") {
      try {
        const apiResult = await runSpaceAPIForScript(scriptContent);
        if (apiResult !== null) return apiResult;
      } catch (error) {
        if (method === "spaceapi" || !(error instanceof SpaceAPIProtocolError && error.canFallback)) {
          throw error;
        }
      }
    }
    return await runAppleScript(scriptContent);
  } catch (error) {
    if (options.showErrorToast !== false) await handleDesktopRenamerError(error, errorMessage);
    throw error;
  }
}

export async function runSpaceAPIForScript(scriptContent: string): Promise<string | null> {
  if (scriptContent.includes("get windows")) {
    return await runLegacySpaceAPICommandWithCompatibility("getWindows", {});
  }
  if (scriptContent.includes("get all spaces") && scriptContent.includes("get current space name")) {
    return await runLegacySpaceAPICommandWithCompatibility("getSpaceSnapshot", {});
  }
  return null;
}

async function runSpaceAPIMethod(
  command: SpaceAPIMethod,
  arguments_: SpaceAPIParameters,
  fallbackToLegacy: boolean,
): Promise<unknown> {
  let info: SpaceAPIInfo;
  try {
    info = await getStructuredAPIInfo();
  } catch (error) {
    if (fallbackToLegacy && error instanceof SpaceAPIProtocolError && error.canFallback) {
      return await runLegacySpaceAPICommandWithCompatibility(command, stringifyLegacyParameters(arguments_));
    }
    throw error;
  }

  // getAPIInfo is the capability handshake itself. Reuse the cached result
  // instead of issuing a second identical request for the public helper.
  if (command === "getAPIInfo") return info;

  if (!info.supportedMethods.includes(command)) {
    if (fallbackToLegacy && info.legacyNotifications) {
      return await runLegacySpaceAPICommand(
        command,
        stringifyLegacyParameters(arguments_),
        structuredAPINamespace ?? "preferred",
      );
    }
    throw new SpaceAPIProtocolError(
      `DesktopRenamer does not support SpaceAPI method '${command}'.`,
      SPACE_API_ERROR_CODES.methodNotFound,
      { command },
      true,
    );
  }

  // Once getAPIInfo has succeeded, the structured server is authoritative. Do
  // not retry a request through another transport after an ambiguous response.
  return await runStructuredSpaceAPICommand(
    command,
    arguments_ as SpaceAPIMethodArguments[typeof command],
    structuredAPINamespace ?? "preferred",
  );
}

async function getStructuredAPIInfo(): Promise<SpaceAPIInfo> {
  if (!structuredAPIInfoLookup) {
    structuredAPIMaxPayloadBytes = MAX_STRUCTURED_PAYLOAD_BYTES;
    structuredAPIInfoLookup = requestStructuredAPIInfo().catch((error) => {
      structuredAPIInfoLookup = null;
      structuredAPIMaxPayloadBytes = MAX_STRUCTURED_PAYLOAD_BYTES;
      structuredAPINamespace = null;
      throw error;
    });
  }
  return await structuredAPIInfoLookup;
}

async function requestStructuredAPIInfo(): Promise<SpaceAPIInfo> {
  const namespaces: SpaceAPINamespace[] = structuredAPINamespace
    ? [structuredAPINamespace, structuredAPINamespace === "preferred" ? "legacy" : "preferred"]
    : ["preferred", "legacy"];
  let lastError: unknown;

  for (const namespace of namespaces) {
    try {
      const info = await runStructuredSpaceAPICommand("getAPIInfo", {}, namespace);
      structuredAPINamespace = namespace;
      structuredAPIMaxPayloadBytes = Math.min(MAX_STRUCTURED_PAYLOAD_BYTES, info.maxPayloadBytes);
      return info;
    } catch (error) {
      lastError = error;
      if (!(error instanceof SpaceAPIProtocolError && error.canFallback)) throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to connect to DesktopRenamer SpaceAPI.");
}

export function stringifyLegacyParameters(arguments_: SpaceAPIParameters): Record<string, string> {
  return Object.fromEntries(Object.entries(arguments_).map(([key, value]) => [key, String(value)]));
}

function requestTimeout(command: SpaceAPIMethod): number {
  return STRUCTURED_READ_METHODS.has(command) ? READ_REQUEST_TIMEOUT_MS : OPERATION_REQUEST_TIMEOUT_MS;
}

function invalidMethodArgument(
  command: SpaceAPIMethod,
  parameter: string,
  expected: string,
  message: string,
): SpaceAPIProtocolError {
  return protocolError(message, SPACE_API_ERROR_CODES.invalidParams, { parameter, expected, command }, false);
}

export function normalizeMethodArguments(command: SpaceAPIMethod, arguments_: unknown): SpaceAPIParameters {
  const definition = SPACE_API_METHOD_DEFINITIONS[command];
  if (!definition) {
    throw protocolError(
      `Unsupported SpaceAPI method '${command}'.`,
      SPACE_API_ERROR_CODES.methodNotFound,
      { command },
      false,
    );
  }
  if (!isRecord(arguments_)) {
    throw invalidMethodArgument(command, "params", "object", "SpaceAPI method parameters must be an object.");
  }

  const unknownParameter = Object.keys(arguments_)
    .sort()
    .find((parameter) => definition.parameters[parameter] === undefined);
  if (unknownParameter) {
    throw invalidMethodArgument(
      command,
      unknownParameter,
      "a supported parameter",
      `Parameter '${unknownParameter}' is not supported for ${command}.`,
    );
  }

  for (const parameter of definition.required) {
    const value = arguments_[parameter];
    if (value === undefined || (typeof value === "string" && value.length === 0)) {
      throw invalidMethodArgument(
        command,
        parameter,
        parameterKindDescription(definition.parameters[parameter] ?? "string"),
        `Missing required parameter '${parameter}'.`,
      );
    }
  }

  const normalized: SpaceAPIParameters = {};
  for (const [parameter, value] of Object.entries(arguments_)) {
    if (value === undefined) continue;
    const kind = definition.parameters[parameter];
    if (!kind) continue;

    switch (kind) {
      case "string":
        if (typeof value !== "string" || value.length === 0) {
          throw invalidMethodArgument(
            command,
            parameter,
            parameterKindDescription(kind),
            `Parameter '${parameter}' must be a non-empty string.`,
          );
        }
        normalized[parameter] = value;
        break;
      case "positiveInteger": {
        const numberValue = typeof value === "number" ? value : Number(value);
        if (!Number.isSafeInteger(numberValue) || numberValue <= 0) {
          throw invalidMethodArgument(
            command,
            parameter,
            parameterKindDescription(kind),
            `Parameter '${parameter}' must be a positive integer.`,
          );
        }
        normalized[parameter] = numberValue;
        break;
      }
      case "boolean":
        if (typeof value !== "boolean") {
          throw invalidMethodArgument(
            command,
            parameter,
            parameterKindDescription(kind),
            `Parameter '${parameter}' must be a Boolean.`,
          );
        }
        normalized[parameter] = value;
        break;
      case "direction":
        if (typeof value !== "string" || !["up", "down"].includes(value.toLowerCase())) {
          throw invalidMethodArgument(
            command,
            parameter,
            parameterKindDescription(kind),
            `Parameter '${parameter}' must be either 'up' or 'down'.`,
          );
        }
        normalized[parameter] = value.toLowerCase();
        break;
      case "windowAction":
        if (typeof value !== "string" || !SPACE_API_WINDOW_ACTIONS.some((action) => action === value)) {
          throw invalidMethodArgument(
            command,
            parameter,
            parameterKindDescription(kind),
            `Parameter '${parameter}' is not a supported window action.`,
          );
        }
        normalized[parameter] = value;
        break;
    }
  }
  return normalized;
}

function parameterKindDescription(kind: SpaceAPIParameterKind): string {
  switch (kind) {
    case "string":
      return "a non-empty string";
    case "positiveInteger":
      return "a positive integer";
    case "boolean":
      return "a Boolean";
    case "direction":
      return "one of: up, down";
    case "windowAction":
      return `one of: ${SPACE_API_WINDOW_ACTIONS.join(", ")}`;
  }
}

function makeStructuredRequestPayload(
  requestID: string,
  command: SpaceAPIMethod,
  arguments_: SpaceAPIParameters,
): string {
  const request: {
    jsonrpc: string;
    id: string;
    method: SpaceAPIMethod;
    params?: SpaceAPIParameters;
  } = {
    jsonrpc: DESKTOP_RENAMER_JSON_RPC_VERSION,
    id: requestID,
    method: command,
  };
  if (Object.keys(arguments_).length > 0) request.params = arguments_;
  return JSON.stringify(request);
}

export async function runStructuredSpaceAPICommand<M extends SpaceAPIMethod>(
  command: M,
  arguments_: SpaceAPIMethodArguments[M] = {} as SpaceAPIMethodArguments[M],
  namespace: SpaceAPINamespace = "preferred",
): Promise<SpaceAPIMethodResults[M]> {
  const requestID = randomUUID();
  const parameters = normalizeMethodArguments(command, arguments_);
  const requestPayload = makeStructuredRequestPayload(requestID, command, parameters);
  if (Buffer.byteLength(requestPayload, "utf8") > structuredAPIMaxPayloadBytes) {
    throw protocolError(
      "Structured SpaceAPI request exceeds the maximum size.",
      SPACE_API_ERROR_CODES.payloadTooLarge,
      undefined,
      false,
    );
  }
  const script = makeStructuredSpaceAPIJXA(requestID, requestPayload, requestTimeout(command), namespace);

  try {
    const { stdout, stderr } = await execFileAsync("/usr/bin/osascript", ["-l", "JavaScript", "-e", script], {
      maxBuffer: 2 * 1024 * 1024,
    });
    const output = (stdout.trim() ? stdout : stderr).trimEnd();
    if (!output) throw new Error("DesktopRenamer returned an empty structured response.");
    const response = decodeStructuredRPCResponse(output, requestID, structuredAPIMaxPayloadBytes);
    return validateStructuredResult(command, response.result) as SpaceAPIMethodResults[M];
  } catch (error) {
    if (error instanceof SpaceAPIProtocolError) {
      if (
        error.code === SPACE_API_ERROR_CODES.methodNotFound ||
        error.code === SPACE_API_ERROR_CODES.unsupportedContract
      ) {
        // The app may have restarted or changed capabilities since the
        // negotiation was cached. Force the next call to negotiate again.
        structuredAPIInfoLookup = null;
        structuredAPIMaxPayloadBytes = MAX_STRUCTURED_PAYLOAD_BYTES;
        structuredAPINamespace = null;
      }
      throw error;
    }
    throw protocolError(
      error instanceof Error ? error.message : "Structured SpaceAPI request failed.",
      undefined,
      undefined,
      true,
    );
  }
}

export async function runDesktopRenamerMethod<M extends SpaceAPIMethod>(
  command: M,
  arguments_: SpaceAPIMethodArguments[M] = {} as SpaceAPIMethodArguments[M],
  errorMessage = "Is DesktopRenamer running?",
  options: DesktopRenamerRequestOptions = {},
): Promise<SpaceAPIMethodResults[M]> {
  let parameters: SpaceAPIParameters;
  try {
    parameters = normalizeMethodArguments(command, arguments_);
    await requireDesktopRenamerInstalled();
  } catch (error) {
    if (options.showErrorToast !== false) await handleDesktopRenamerError(error, errorMessage);
    throw error;
  }

  // API information is a structured capability record. The AppleScript
  // dictionary exposes the same record for Script Editor, but Raycast's
  // string-only AppleScript bridge cannot reliably decode native records.
  // Always use the correlated JSON-RPC form for this handshake.
  if (command === "getAPIInfo") {
    try {
      return (await getStructuredAPIInfo()) as SpaceAPIMethodResults[M];
    } catch (error) {
      if (options.showErrorToast !== false) await handleDesktopRenamerError(error, errorMessage);
      throw error;
    }
  }

  const method = communicationMethod();
  if (method === "applescript") {
    const result = await runDesktopRenamerScript(makeAppleScriptForMethod(command, parameters), errorMessage, options);
    try {
      return normalizeDesktopRenamerMethodResult(command, result);
    } catch (error) {
      if (options.showErrorToast !== false) await handleDesktopRenamerError(error, errorMessage);
      throw error;
    }
  }

  try {
    const result = await runSpaceAPIMethod(command, parameters, true);
    return normalizeDesktopRenamerMethodResult(command, result);
  } catch (error) {
    // A read can safely fall back to AppleScript. A write must stop after an
    // ambiguous API response so the same operation is never executed twice.
    if (
      method === "automatic" &&
      isReadSpaceAPIMethod(command) &&
      error instanceof SpaceAPIProtocolError &&
      error.canFallback
    ) {
      try {
        const result = await runAppleScript(makeAppleScriptForMethod(command, parameters));
        return normalizeDesktopRenamerMethodResult(command, result);
      } catch (scriptError) {
        if (options.showErrorToast !== false) await handleDesktopRenamerError(scriptError, errorMessage);
        throw scriptError;
      }
    }
    if (options.showErrorToast !== false) await handleDesktopRenamerError(error, errorMessage);
    throw error;
  }
}

function normalizeDesktopRenamerMethodResult<M extends SpaceAPIMethod>(
  command: M,
  result: unknown,
): SpaceAPIMethodResults[M] {
  if (result === "API Disabled") {
    throw new SpaceAPIProtocolError("SpaceAPI Disabled", SPACE_API_ERROR_CODES.apiDisabled, { command }, false);
  }
  switch (command) {
    case "getAPIInfo": {
      if (!isRecord(result)) {
        throw protocolError(
          "DesktopRenamer did not return structured API information.",
          SPACE_API_ERROR_CODES.unsupportedContract,
          undefined,
          false,
        );
      }
      return parseAPIInfo(result) as SpaceAPIMethodResults[M];
    }
    case "getAPIVersion":
      return requiredString(result, "result") as SpaceAPIMethodResults[M];
    case "getSpaceSnapshot":
      return (
        isRecord(result) ? parseSnapshot(result) : parseLegacySpaceSnapshotResult(requiredString(result, "result"))
      ) as SpaceAPIMethodResults[M];
    case "getCurrentSpaceName":
      return requiredString(result, "result") as SpaceAPIMethodResults[M];
    case "getCurrentSpaceID":
      return (
        Array.isArray(result)
          ? result.map((value) => requiredString(value, "result"))
          : requiredString(result, "result")
              .split(",")
              .map((spaceID) => spaceID.trim())
              .filter(Boolean)
      ) as SpaceAPIMethodResults[M];
    case "getAllSpaces":
      if (Array.isArray(result)) {
        return result.map(parseSpaceRecord) as SpaceAPIMethodResults[M];
      }
      if (isRecord(result) && Array.isArray(result.spaces)) {
        return result.spaces.map(parseSpaceRecord) as SpaceAPIMethodResults[M];
      }
      return parseLegacySpaceRecords(requiredString(result, "result")) as SpaceAPIMethodResults[M];
    case "getWindows":
      return (
        isRecord(result) ? parseWindowsSnapshot(result) : parseLegacyWindowsSnapshot(requiredString(result, "result"))
      ) as SpaceAPIMethodResults[M];
    case "toggleMenubar":
    case "toggleLauncher":
    case "toggleLabels":
    case "toggleActiveLabel":
    case "togglePreviewLabel":
    case "toggleDesktopVisibility":
      return booleanResult(result) as SpaceAPIMethodResults[M];
    default:
      return operationResult(result) as SpaceAPIMethodResults[M];
  }
}

function operationResult(result: unknown): SpaceAPIOperationResult {
  if (isRecord(result) && typeof result.accepted === "boolean") {
    return { accepted: result.accepted };
  }
  if (typeof result === "boolean") return { accepted: result };
  if (result === "true" || result === "false") return { accepted: result === "true" };
  // AppleScript operations intentionally have no result value. Normalize that
  // compatibility behavior to the structured operation result for callers.
  if (result === "" || result === null || result === undefined) return { accepted: true };
  throw new Error("DesktopRenamer returned an invalid operation result.");
}

function booleanResult(result: unknown): boolean {
  if (typeof result === "boolean") return result;
  if (typeof result === "string" && (result === "true" || result === "false")) return result === "true";
  throw new Error("DesktopRenamer returned an invalid Boolean result.");
}
