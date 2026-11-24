import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import {
  LEGACY_DESKTOP_RENAMER_API_PREFIX,
  PREFERRED_DESKTOP_RENAMER_API_PREFIX,
  SPACE_API_ERROR_CODES,
  SpaceAPIProtocolError,
  READ_REQUEST_TIMEOUT_MS,
  OPERATION_REQUEST_TIMEOUT_MS,
  type SpaceAPINamespace,
  type SpaceAPISnapshot,
  type SpaceAPISpaceRecord,
  type SpaceAPIWindowRecord,
  type SpaceAPIWindowsSnapshot,
} from "./contract";
import { isReadSpaceAPIMethod, isRecord, protocolError } from "./codec";

const execFileAsync = promisify(execFile);
const SPACE_API_COMMAND_NOTIFICATION = `${PREFERRED_DESKTOP_RENAMER_API_PREFIX}.PerformCommand`;
const SPACE_API_RESULT_NOTIFICATION = `${PREFERRED_DESKTOP_RENAMER_API_PREFIX}.CommandResult`;
const LEGACY_SPACE_API_COMMAND_NOTIFICATION = `${LEGACY_DESKTOP_RENAMER_API_PREFIX}.PerformCommand`;
const LEGACY_SPACE_API_RESULT_NOTIFICATION = `${LEGACY_DESKTOP_RENAMER_API_PREFIX}.CommandResult`;

function parseLegacyBoolean(value: unknown): boolean | undefined {
  if (value === true || value === 1 || value === "true" || value === "1") return true;
  if (value === false || value === 0 || value === "false" || value === "0") return false;
  return undefined;
}

export function parseLegacySpaceSnapshotResult(raw: string): SpaceAPISnapshot {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const value = JSON.parse(trimmed) as unknown;
      const record = isRecord(value) ? value : undefined;
      if (!record || !Array.isArray(record.spaces)) throw new Error("Invalid legacy snapshot object.");
      const spaces = record.spaces.map(parseLegacySpaceObject);
      const currentSpaceIDs = Array.isArray(record.currentSpaceIDs)
        ? record.currentSpaceIDs.filter((spaceID): spaceID is string => typeof spaceID === "string")
        : typeof record.currentSpaceID === "string"
          ? record.currentSpaceID
              .split(",")
              .map((spaceID) => spaceID.trim())
              .filter(Boolean)
          : [];
      return {
        apiVersion: typeof record.apiVersion === "string" && record.apiVersion.length > 0 ? record.apiVersion : "0.0.0",
        revision: typeof record.revision === "number" && Number.isSafeInteger(record.revision) ? record.revision : 0,
        timestamp:
          typeof record.timestamp === "string" && record.timestamp.length > 0
            ? record.timestamp
            : new Date().toISOString(),
        currentSpaceIDs,
        currentSpaceID: typeof record.currentSpaceID === "string" ? record.currentSpaceID : undefined,
        currentDisplayID: typeof record.currentDisplayID === "string" ? record.currentDisplayID : undefined,
        currentSpaceName: typeof record.currentSpaceName === "string" ? record.currentSpaceName : "",
        movedWindowsCount:
          typeof record.movedWindowsCount === "number" &&
          Number.isSafeInteger(record.movedWindowsCount) &&
          record.movedWindowsCount >= 0
            ? record.movedWindowsCount
            : 0,
        spaces,
      };
    } catch {
      throw new Error("DesktopRenamer returned an invalid legacy space snapshot.");
    }
  }

  if (raw.split("~~~").length < 3) {
    throw new Error("DesktopRenamer returned an invalid legacy space snapshot.");
  }
  const parts = raw.split("~~~");
  const currentSpaceID = parts.pop()?.trim() ?? "";
  const currentSpaceName = parts.pop()?.trim() ?? "";
  const spaces = parseLegacySpaceRecords(parts.join("~~~"));
  return {
    apiVersion: "0.0.0",
    revision: 0,
    timestamp: new Date().toISOString(),
    currentSpaceIDs: currentSpaceID
      .split(",")
      .map((spaceID) => spaceID.trim())
      .filter(Boolean),
    currentSpaceID: undefined,
    currentDisplayID: undefined,
    currentSpaceName,
    movedWindowsCount: 0,
    spaces,
  };
}

function parseLegacySpaceObject(value: unknown): SpaceAPISpaceRecord {
  const record = isRecord(value) ? value : undefined;
  if (!record) throw new Error("Invalid legacy space record.");
  const id = typeof record.id === "string" ? record.id : "";
  if (!id) throw new Error("Legacy space record has no ID.");
  const displayID = typeof record.displayID === "string" ? record.displayID : "Display";
  const number = typeof record.number === "number" && Number.isSafeInteger(record.number) ? record.number : 0;
  return {
    id,
    name: typeof record.name === "string" && record.name.length > 0 ? record.name : "Unknown",
    displayID,
    displayName:
      typeof record.displayName === "string" && record.displayName.length > 0 ? record.displayName : displayID,
    number,
    isFullscreen: parseLegacyBoolean(record.isFullscreen),
    appName: typeof record.appName === "string" ? record.appName : null,
    appPath: typeof record.appPath === "string" && record.appPath.length > 0 ? record.appPath : null,
    globalShortcutNumber:
      typeof record.globalShortcutNumber === "number" && Number.isSafeInteger(record.globalShortcutNumber)
        ? record.globalShortcutNumber
        : null,
    isLocked: record.isLocked === true || record.isLocked === 1,
  };
}

export function parseLegacySpaceRecords(raw: string): SpaceAPISpaceRecord[] {
  return raw.split(/\r?\n/).flatMap((line) => {
    const normalizedLine = line.startsWith(">") ? line.slice(1) : line;
    if (!normalizedLine.trim()) return [];
    const parts = normalizedLine.split("~");
    if (parts.length < 4) return [];
    const id = parts[0]?.trim() ?? "";
    if (!id) return [];
    const numberText = parts[3]?.trim() ?? "";
    if (!numberText) return [];
    const number = Number(numberText);
    if (!Number.isSafeInteger(number) || number < 0) return [];
    const displayID = parts[2]?.trim() || "Display";
    return [
      {
        id,
        name: parts[1] || "Unknown",
        displayID,
        displayName: displayID,
        number,
        isFullscreen: parts.length >= 5 ? parseLegacyBoolean(parts[4]?.trim()) : undefined,
        appName: null,
        appPath: parts[5] || null,
        globalShortcutNumber: null,
        isLocked: parts.length >= 7 && parts[6] === "1",
      },
    ];
  });
}

export function parseLegacyWindowsSnapshot(raw: string): SpaceAPIWindowsSnapshot {
  const spaces: SpaceAPISpaceRecord[] = [];
  const windows: SpaceAPIWindowRecord[] = [];
  let currentSpace: SpaceAPISpaceRecord | null = null;

  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith(">")) {
      const nextSpace = parseLegacySpaceRecords(line)[0];
      if (nextSpace) {
        currentSpace = nextSpace;
        spaces.push(nextSpace);
      }
      continue;
    }
    if (!line.startsWith("  ") || !currentSpace) continue;

    const parts = line.trim().split("|");
    if (parts.length < 5) continue;
    const id = Number(parts[0] ?? "");
    const pid = Number(parts[1] ?? "");
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(pid) || pid <= 0) continue;

    const hasStateFields = parts.length >= 7;
    const titleEnd = hasStateFields ? parts.length - 2 : parts.length;
    windows.push({
      id,
      pid,
      ownerName: parts[2] ?? "Unknown",
      appPath: parts[3] || null,
      title: parts.slice(4, titleEnd).join("|") || null,
      spaceID: currentSpace.id,
      isMinimized: hasStateFields ? parseLegacyBoolean(parts[parts.length - 2]?.trim()) : undefined,
      isHidden: hasStateFields ? parseLegacyBoolean(parts[parts.length - 1]?.trim()) : undefined,
    });
  }

  return {
    apiVersion: "0.0.0",
    revision: 0,
    timestamp: new Date().toISOString(),
    spaces,
    windows,
  };
}

export async function runLegacySpaceAPICommand(
  command: string,
  arguments_: Record<string, string>,
  namespace: SpaceAPINamespace = "preferred",
): Promise<string> {
  const requestID = randomUUID();
  const timeoutMs = isReadSpaceAPIMethod(command) ? READ_REQUEST_TIMEOUT_MS : OPERATION_REQUEST_TIMEOUT_MS;
  const script = makeLegacySpaceAPIJXA(requestID, command, arguments_, timeoutMs, namespace);
  let stdout: string;
  let stderr: string;
  try {
    ({ stdout, stderr } = await execFileAsync("/usr/bin/osascript", ["-l", "JavaScript", "-e", script], {
      maxBuffer: 10 * 1024 * 1024,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Legacy SpaceAPI request failed.";
    const code = message.includes("API Disabled") ? SPACE_API_ERROR_CODES.apiDisabled : undefined;
    throw protocolError(message, code, undefined, true);
  }

  const output = (stdout.trim() ? stdout : stderr).trimEnd();
  let response: unknown;
  try {
    response = JSON.parse(output) as unknown;
  } catch {
    throw protocolError(
      "Legacy SpaceAPI returned an invalid response.",
      SPACE_API_ERROR_CODES.invalidRequest,
      undefined,
      true,
    );
  }
  if (!isRecord(response)) {
    throw protocolError(
      "Legacy SpaceAPI returned an invalid response.",
      SPACE_API_ERROR_CODES.invalidRequest,
      undefined,
      true,
    );
  }
  if (response.success === undefined) {
    throw protocolError(
      "Legacy SpaceAPI response has no success status.",
      SPACE_API_ERROR_CODES.invalidRequest,
      { command },
      true,
    );
  }
  const succeeded =
    response.success === true || response.success === "true" || response.success === 1 || response.success === "1";
  if (!succeeded) {
    const message =
      typeof response.error === "string" && response.error.length > 0
        ? response.error
        : "Legacy SpaceAPI command failed.";
    const code = message.includes("API Disabled")
      ? SPACE_API_ERROR_CODES.apiDisabled
      : SPACE_API_ERROR_CODES.operationFailed;
    throw protocolError(message, code, { command }, code !== SPACE_API_ERROR_CODES.apiDisabled);
  }
  if (response.apiVersion !== undefined && response.apiVersion !== null && typeof response.apiVersion !== "string") {
    throw protocolError(
      "Legacy SpaceAPI response has an invalid API version.",
      SPACE_API_ERROR_CODES.invalidRequest,
      undefined,
      true,
    );
  }
  if (response.result !== undefined && response.result !== null && typeof response.result !== "string") {
    throw protocolError(
      "Legacy SpaceAPI response has an invalid result.",
      SPACE_API_ERROR_CODES.invalidRequest,
      undefined,
      true,
    );
  }
  return typeof response.result === "string" ? response.result : "";
}

export async function runLegacySpaceAPICommandWithCompatibility(
  command: string,
  arguments_: Record<string, string>,
): Promise<string> {
  try {
    return await runLegacySpaceAPICommand(command, arguments_, "preferred");
  } catch (error) {
    if (
      !(error instanceof SpaceAPIProtocolError) ||
      !error.canFallback ||
      error.code !== SPACE_API_ERROR_CODES.invalidRequest
    ) {
      throw error;
    }
    return await runLegacySpaceAPICommand(command, arguments_, "legacy");
  }
}

function makeLegacySpaceAPIJXA(
  requestID: string,
  command: string,
  arguments_: Record<string, string>,
  timeoutMs: number,
  namespace: SpaceAPINamespace,
): string {
  const requestObject = { requestID, command, arguments: arguments_ };
  const commandNotification =
    namespace === "legacy" ? LEGACY_SPACE_API_COMMAND_NOTIFICATION : SPACE_API_COMMAND_NOTIFICATION;
  const resultNotification =
    namespace === "legacy" ? LEGACY_SPACE_API_RESULT_NOTIFICATION : SPACE_API_RESULT_NOTIFICATION;

  return `
ObjC.import('Foundation');
const requestObject = ${JSON.stringify(requestObject)};
const center = $.NSDistributedNotificationCenter.defaultCenter;
const resultName = ${JSON.stringify(resultNotification)};
let response = null;
let finished = false;
const observer = center.addObserverForNameObjectQueueUsingBlock(
  resultName,
  undefined,
  undefined,
  function(notification) {
    const info = ObjC.unwrap(notification.userInfo);
    const responseID = info ? ObjC.unwrap(info.requestID) : undefined;
    if (info && String(responseID) === requestObject.requestID) {
      response = info;
      finished = true;
    }
  }
);
const userInfo = $.NSMutableDictionary.dictionary;
userInfo.setObjectForKey(requestObject.requestID, 'requestID');
userInfo.setObjectForKey(requestObject.command, 'command');
userInfo.setObjectForKey(JSON.stringify(requestObject.arguments), 'argumentsJSON');
center.postNotificationNameObjectUserInfoDeliverImmediately(${JSON.stringify(commandNotification)}, undefined, userInfo, true);
const deadline = Date.now() + ${timeoutMs};
while (!finished && Date.now() < deadline) {
  $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.01));
}
center.removeObserver(observer);
if (!response) throw new Error('SpaceAPI request timed out.');
const success = ObjC.unwrap(response.success);
if (!(success === true || String(success) === 'true' || String(success) === '1')) {
  const error = ObjC.unwrap(response.error);
  throw new Error(String(error || 'SpaceAPI command failed.'));
}
const result = ObjC.unwrap(response.result);
const apiVersion = ObjC.unwrap(response.apiVersion);
console.log(JSON.stringify({success: true, apiVersion: apiVersion || null, result: result || ''}));
`;
}
