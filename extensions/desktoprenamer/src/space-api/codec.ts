import {
  DESKTOP_RENAMER_JSON_RPC_VERSION,
  MAX_STRUCTURED_PAYLOAD_BYTES,
  SPACE_API_ERROR_CODES,
  STRUCTURED_DESKTOP_RENAMER_API_VERSION,
  SUPPORTED_DESKTOP_RENAMER_API_MAJOR,
  STRUCTURED_READ_METHODS,
  SpaceAPIProtocolError,
  type SpaceAPIInfo,
  type SpaceAPIMethod,
  type SpaceAPIOperationResult,
  type SpaceAPISnapshot,
  type SpaceAPISpaceRecord,
  type JSONRPCEvent,
  type JSONRPCResponse,
  type SpaceAPIStateChangedEvent,
  type SpaceAPIWindowRecord,
  type SpaceAPIWindowsSnapshot,
} from "./contract";

function compareVersions(left: string, right: string): number {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  if (!leftParts || !rightParts) return Number.NaN;
  for (let index = 0; index < leftParts.length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function parseVersion(version: string): [number, number, number] | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  const parts = match.slice(1).map((part) => Number(part));
  const [major, minor, patch] = parts;
  if (
    major === undefined ||
    minor === undefined ||
    patch === undefined ||
    [major, minor, patch].some((part) => !Number.isSafeInteger(part) || part < 0)
  ) {
    return null;
  }
  return [major, minor, patch];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function protocolError(
  message: string,
  code: number = SPACE_API_ERROR_CODES.invalidRequest,
  data?: unknown,
  canFallback = true,
): SpaceAPIProtocolError {
  return new SpaceAPIProtocolError(message, code, data, canFallback);
}

export function isReadSpaceAPIMethod(method: string): boolean {
  return STRUCTURED_READ_METHODS.has(method as SpaceAPIMethod);
}

export function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw protocolError(`Structured response field '${field}' must be a non-empty string.`);
  }
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  return requiredString(value, field);
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw protocolError(`Structured response field '${field}' must be a Boolean.`);
  }
  return value;
}

function requiredInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw protocolError(`Structured response field '${field}' must be a safe integer.`);
  }
  return value;
}

function requiredNonNegativeInteger(value: unknown, field: string): number {
  const integer = requiredInteger(value, field);
  if (integer < 0) {
    throw protocolError(`Structured response field '${field}' must be non-negative.`);
  }
  return integer;
}

function requiredPositiveInteger(value: unknown, field: string): number {
  const integer = requiredInteger(value, field);
  if (integer <= 0) {
    throw protocolError(`Structured response field '${field}' must be a positive integer.`);
  }
  return integer;
}

function requiredStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw protocolError(`Structured response field '${field}' must be an array of strings.`);
  }
  return value;
}

function validateContractVersion(version: string, minimumVersion = STRUCTURED_DESKTOP_RENAMER_API_VERSION): void {
  const parsedVersion = parseVersion(version);
  const minimum = parseVersion(minimumVersion);
  if (
    !parsedVersion ||
    !minimum ||
    parsedVersion[0] !== SUPPORTED_DESKTOP_RENAMER_API_MAJOR ||
    compareVersions(version, minimumVersion) < 0
  ) {
    throw protocolError(
      `DesktopRenamer structured API ${minimumVersion} or newer is required (found ${version}).`,
      SPACE_API_ERROR_CODES.unsupportedContract,
      { expected: minimumVersion, found: version },
      true,
    );
  }
}

export function parseSpaceRecord(value: unknown, index: number): SpaceAPISpaceRecord {
  const record = isRecord(value) ? value : undefined;
  if (!record) throw protocolError(`Structured space at index ${index} must be an object.`);

  const appName = nullableString(record.appName, `spaces[${index}].appName`);
  const appPath = nullableString(record.appPath, `spaces[${index}].appPath`);
  const globalShortcutNumber =
    record.globalShortcutNumber === undefined || record.globalShortcutNumber === null
      ? null
      : requiredNonNegativeInteger(record.globalShortcutNumber, `spaces[${index}].globalShortcutNumber`);

  return {
    id: requiredString(record.id, `spaces[${index}].id`),
    name: requiredString(record.name, `spaces[${index}].name`),
    displayID: requiredString(record.displayID, `spaces[${index}].displayID`),
    displayName: requiredString(record.displayName, `spaces[${index}].displayName`),
    number: requiredNonNegativeInteger(record.number, `spaces[${index}].number`),
    isFullscreen: requiredBoolean(record.isFullscreen, `spaces[${index}].isFullscreen`),
    appName,
    appPath,
    globalShortcutNumber,
    isLocked: record.isLocked === undefined ? false : requiredBoolean(record.isLocked, `spaces[${index}].isLocked`),
  };
}

export function parseWindowRecord(value: unknown, index: number): SpaceAPIWindowRecord {
  const record = isRecord(value) ? value : undefined;
  if (!record) throw protocolError(`Structured window at index ${index} must be an object.`);

  const appPath = nullableString(record.appPath, `windows[${index}].appPath`);
  const title = nullableString(record.title, `windows[${index}].title`);
  return {
    id: requiredPositiveInteger(record.id, `windows[${index}].id`),
    pid: requiredPositiveInteger(record.pid, `windows[${index}].pid`),
    ownerName: requiredString(record.ownerName, `windows[${index}].ownerName`),
    spaceID: requiredString(record.spaceID, `windows[${index}].spaceID`),
    isMinimized: requiredBoolean(record.isMinimized, `windows[${index}].isMinimized`),
    isHidden: requiredBoolean(record.isHidden, `windows[${index}].isHidden`),
    appPath,
    title,
  };
}

export function parseSnapshot(value: unknown): SpaceAPISnapshot {
  const record = isRecord(value) ? value : undefined;
  if (!record) throw protocolError("Structured space snapshot must be an object.");
  const apiVersion = requiredString(record.apiVersion, "apiVersion");
  validateContractVersion(apiVersion);
  if (!Array.isArray(record.spaces)) throw protocolError("Structured snapshot field 'spaces' must be an array.");

  return {
    apiVersion,
    revision: requiredNonNegativeInteger(record.revision, "revision"),
    timestamp: requiredString(record.timestamp, "timestamp"),
    currentSpaceIDs: requiredStringArray(record.currentSpaceIDs, "currentSpaceIDs"),
    currentSpaceID: nullableString(record.currentSpaceID, "currentSpaceID") ?? undefined,
    currentDisplayID: nullableString(record.currentDisplayID, "currentDisplayID") ?? undefined,
    currentSpaceName: requiredString(record.currentSpaceName, "currentSpaceName"),
    movedWindowsCount:
      record.movedWindowsCount === undefined
        ? 0
        : requiredNonNegativeInteger(record.movedWindowsCount, "movedWindowsCount"),
    spaces: record.spaces.map(parseSpaceRecord),
  };
}

export function parseWindowsSnapshot(value: unknown): SpaceAPIWindowsSnapshot {
  const record = isRecord(value) ? value : undefined;
  if (!record) throw protocolError("Structured window snapshot must be an object.");
  const apiVersion = requiredString(record.apiVersion, "apiVersion");
  validateContractVersion(apiVersion);
  if (!Array.isArray(record.spaces)) throw protocolError("Structured window snapshot field 'spaces' must be an array.");
  if (!Array.isArray(record.windows))
    throw protocolError("Structured window snapshot field 'windows' must be an array.");

  return {
    apiVersion,
    revision: requiredNonNegativeInteger(record.revision, "revision"),
    timestamp: requiredString(record.timestamp, "timestamp"),
    spaces: record.spaces.map(parseSpaceRecord),
    windows: record.windows.map(parseWindowRecord),
  };
}

export function parseAPIInfo(value: unknown): SpaceAPIInfo {
  const record = isRecord(value) ? value : undefined;
  if (!record) throw protocolError("Structured API information must be an object.");
  const contractVersion = requiredString(record.contractVersion, "contractVersion");
  validateContractVersion(contractVersion);
  const jsonRPCVersion = requiredString(record.jsonRPCVersion, "jsonRPCVersion");
  if (jsonRPCVersion !== DESKTOP_RENAMER_JSON_RPC_VERSION) {
    throw protocolError(
      `Unsupported JSON-RPC version: ${jsonRPCVersion}.`,
      SPACE_API_ERROR_CODES.invalidRequest,
      undefined,
      true,
    );
  }
  const supportedMethods = requiredStringArray(record.supportedMethods, "supportedMethods");
  if (!supportedMethods.includes("getAPIInfo") || new Set(supportedMethods).size !== supportedMethods.length) {
    throw protocolError("Structured API information must advertise a unique getAPIInfo method.");
  }
  const maxPayloadBytes = requiredPositiveInteger(record.maxPayloadBytes, "maxPayloadBytes");
  const legacyNotifications = requiredBoolean(record.legacyNotifications, "legacyNotifications");
  const legacyCompatibility = requiredString(record.legacyCompatibility, "legacyCompatibility");
  const eventNotifications = requiredBoolean(record.eventNotifications, "eventNotifications");
  const eventCapabilities = requiredStringArray(record.eventCapabilities, "eventCapabilities");
  if (new Set(eventCapabilities).size !== eventCapabilities.length) {
    throw protocolError("Structured API information must advertise unique event capabilities.");
  }
  if (!eventNotifications && eventCapabilities.length > 0) {
    throw protocolError("Structured API information cannot advertise event capabilities when events are disabled.");
  }
  return {
    contractVersion,
    jsonRPCVersion,
    supportedMethods,
    legacyNotifications,
    legacyCompatibility,
    eventNotifications,
    eventCapabilities,
    maxPayloadBytes,
  };
}

function parseStructuredPayload(payload: string, maxPayloadBytes = MAX_STRUCTURED_PAYLOAD_BYTES): unknown {
  if (Buffer.byteLength(payload, "utf8") > maxPayloadBytes) {
    throw protocolError(
      "Structured SpaceAPI payload exceeds the maximum size.",
      SPACE_API_ERROR_CODES.payloadTooLarge,
      undefined,
      true,
    );
  }
  try {
    return JSON.parse(payload) as unknown;
  } catch {
    throw protocolError(
      "Structured SpaceAPI response is not valid JSON.",
      SPACE_API_ERROR_CODES.parseError,
      undefined,
      true,
    );
  }
}

export function decodeSpaceSnapshotJSON(payload: string): SpaceAPISnapshot {
  return parseSnapshot(parseStructuredPayload(payload));
}

export function decodeWindowsSnapshotJSON(payload: string): SpaceAPIWindowsSnapshot {
  return parseWindowsSnapshot(parseStructuredPayload(payload));
}

export function decodeStructuredAPIInfo(value: unknown): SpaceAPIInfo {
  return parseAPIInfo(value);
}

export function decodeStructuredRPCResponse(
  payload: string,
  expectedID: string,
  maxPayloadBytes = MAX_STRUCTURED_PAYLOAD_BYTES,
): JSONRPCResponse {
  const value = parseStructuredPayload(payload, maxPayloadBytes);
  const record = isRecord(value) ? value : undefined;
  if (!record) throw protocolError("Structured SpaceAPI response must be an object.");
  if (record.jsonrpc !== DESKTOP_RENAMER_JSON_RPC_VERSION) {
    throw protocolError("Structured SpaceAPI response is not JSON-RPC 2.0.");
  }
  if (typeof record.id !== "string" || record.id.length === 0 || record.id !== expectedID) {
    throw protocolError(
      "Structured SpaceAPI response ID did not match the request.",
      SPACE_API_ERROR_CODES.responseMismatch,
      undefined,
      true,
    );
  }

  const hasResult = Object.prototype.hasOwnProperty.call(record, "result");
  const hasError = Object.prototype.hasOwnProperty.call(record, "error");
  if (hasResult === hasError) {
    throw protocolError("Structured SpaceAPI response must contain exactly one of result or error.");
  }
  if (hasError) {
    const error = isRecord(record.error) ? record.error : undefined;
    if (
      !error ||
      !Number.isSafeInteger(error.code) ||
      typeof error.message !== "string" ||
      error.message.length === 0
    ) {
      throw protocolError("Structured SpaceAPI error is malformed.");
    }
    const errorCode = error.code as number;
    const errorMessage = error.message as string;
    throw new SpaceAPIProtocolError(
      `${errorMessage} (code ${errorCode})`,
      errorCode,
      error.data,
      errorCode === SPACE_API_ERROR_CODES.methodNotFound ||
        errorCode === SPACE_API_ERROR_CODES.unsupportedContract ||
        errorCode === SPACE_API_ERROR_CODES.apiDisabled,
    );
  }
  return {
    jsonrpc: DESKTOP_RENAMER_JSON_RPC_VERSION,
    id: expectedID,
    result: record.result,
  };
}

export function decodeStructuredRPCEvent(
  payload: string,
  maxPayloadBytes = MAX_STRUCTURED_PAYLOAD_BYTES,
): JSONRPCEvent {
  const value = parseStructuredPayload(payload, maxPayloadBytes);
  const record = isRecord(value) ? value : undefined;
  if (!record) throw protocolError("Structured SpaceAPI event must be an object.");
  if (record.jsonrpc !== DESKTOP_RENAMER_JSON_RPC_VERSION) {
    throw protocolError("Structured SpaceAPI event is not JSON-RPC 2.0.");
  }
  if (Object.prototype.hasOwnProperty.call(record, "id")) {
    throw protocolError("Structured SpaceAPI events must not contain an ID.");
  }
  const method = requiredString(record.method, "method");
  if (method.length > 128) {
    throw protocolError("Structured SpaceAPI event method must be at most 128 characters.");
  }
  const params = isRecord(record.params) ? record.params : undefined;
  if (!params) throw protocolError("Structured SpaceAPI event parameters must be an object.");
  return { jsonrpc: DESKTOP_RENAMER_JSON_RPC_VERSION, method, params };
}

export function decodeSpaceAPIStateChangedEvent(payload: string): SpaceAPIStateChangedEvent {
  const event = decodeStructuredRPCEvent(payload);
  if (event.method !== "stateChanged") {
    throw protocolError(`Unsupported SpaceAPI event method '${event.method}'.`);
  }
  const reason = requiredString(event.params.reason, "params.reason");
  return {
    jsonrpc: event.jsonrpc,
    method: "stateChanged",
    reason,
    snapshot: parseSnapshot(event.params.snapshot),
  };
}

export function validateStructuredResult(method: string, result: unknown): unknown {
  switch (method) {
    case "getAPIInfo":
      return parseAPIInfo(result);
    case "getAPIVersion": {
      const version = requiredString(result, "result");
      validateContractVersion(version);
      return version;
    }
    case "getSpaceSnapshot":
      return parseSnapshot(result);
    case "getWindows":
      return parseWindowsSnapshot(result);
    case "getAllSpaces": {
      const record = isRecord(result) ? result : undefined;
      if (Array.isArray(result)) return result.map(parseSpaceRecord);
      if (!record || !Array.isArray(record.spaces)) throw protocolError("Structured spaces result is malformed.");
      return record.spaces.map(parseSpaceRecord);
    }
    case "getCurrentSpaceName":
      return requiredString(result, "result");
    case "getCurrentSpaceID":
      return requiredStringArray(result, "result");
    case "toggleMenubar":
    case "toggleLauncher":
    case "toggleLabels":
    case "toggleActiveLabel":
    case "togglePreviewLabel":
    case "toggleDesktopVisibility":
      return requiredBoolean(result, "result");
    default: {
      const operation = isRecord(result) ? result : undefined;
      if (!operation || typeof operation.accepted !== "boolean") {
        throw protocolError("Structured operation result is malformed.");
      }
      return { accepted: operation.accepted } satisfies SpaceAPIOperationResult;
    }
  }
}
