import {
  appleScriptString,
  parseSerializedRecords,
  runBusyCalScript,
} from "./busycal-script";
import {
  buildBusyCalItemsQueryScript,
  buildBusyCalTasksQueryScript,
  buildCreateBusyCalEventScript,
  buildCreateBusyCalNaturalLanguageItemScript,
  buildCreateBusyCalTaskScript,
  buildOpenBusyCalItemScript,
} from "./busycal-script-builders";
import { busyCalItemFromRecord } from "./busycal-item-record";
import { isUnsupportedNaturalLanguageCommandError } from "./busycal-command-support";
import {
  BusyCalCalendar,
  BusyCalEventInput,
  BusyCalInstallation,
  BusyCalItem,
  BusyCalItemType,
  BusyCalItemQuery,
  BusyCalNaturalLanguageItemInput,
  BusyCalNextAvailableQuery,
  BusyCalNextAvailableResult,
  BusyCalTaskInput,
} from "./types";

/**
 * Lists BusyCal calendars through the app's current scripting surface.
 */
export async function listBusyCalCalendars(
  installation: BusyCalInstallation,
): Promise<BusyCalCalendar[]> {
  const script = `
tell application id ${appleScriptString(installation.bundleId)}
  set rawCalendars to list calendars
end tell
set serializedRecords to {}
repeat with calendarRecord in rawCalendars
  set serializedFields to {¬
    my emitField("accountID", accountID of calendarRecord), ¬
    my emitField("calendarID", calendarID of calendarRecord), ¬
    my emitBooleanField("isSubscribed", isSubscribed of calendarRecord), ¬
    my emitBooleanField("supportsEvents", supportsEvents of calendarRecord), ¬
    my emitBooleanField("supportsTasks", supportsTasks of calendarRecord), ¬
    my emitField("title", title of calendarRecord)}
  set end of serializedRecords to my emitFields(serializedFields)
end repeat
return my emitRecords(serializedRecords)
`;

  const rawOutput = await runBusyCalScript(installation, script);
  return parseSerializedRecords(rawOutput).map((record) => ({
    accountID: record.accountID ?? "",
    calendarID: record.calendarID ?? "",
    isSubscribed: record.isSubscribed === "true",
    supportsEvents: record.supportsEvents === "true",
    supportsTasks: record.supportsTasks === "true",
    title: record.title ?? "",
  }));
}

/**
 * Queries BusyCal items and maps them into the list-friendly item model used by the extension.
 */
export async function queryBusyCalItems(
  installation: BusyCalInstallation,
  query: BusyCalItemQuery,
): Promise<BusyCalItem[]> {
  if (queryBusyCalItemsStrategy(query.itemTypes) === "task") {
    return queryBusyCalTasks(installation, query);
  }

  const rawOutput = await runBusyCalScript(
    installation,
    buildBusyCalItemsQueryScript(installation.bundleId, query),
  );

  return parseSerializedRecords(rawOutput)
    .map((record) => busyCalItemFromRecord(record))
    .filter((item) => item.id.length > 0);
}

/**
 * Chooses the BusyCal query route that preserves the app's own mixed-item semantics.
 */
export function queryBusyCalItemsStrategy(
  itemTypes?: BusyCalItemType[],
): "mixed" | "task" {
  if (!itemTypes || itemTypes.length !== 1) {
    return "mixed";
  }

  return itemTypes[0] === "task" ? "task" : "mixed";
}

/**
 * Runs the task-specific BusyCal query path.
 *
 * Task-only queries stay separate because BusyCal's task results omit some
 * event fields and carry task-specific date semantics that are easier to keep
 * correct when normalized from the dedicated command.
 *
 * - Parameters:
 *   - installation: The BusyCal install to query.
 *   - query: The task query constraints.
 * - Returns: Normalized BusyCal task items.
 */
async function queryBusyCalTasks(
  installation: BusyCalInstallation,
  query: BusyCalItemQuery,
): Promise<BusyCalItem[]> {
  const rawOutput = await runBusyCalScript(
    installation,
    buildBusyCalTasksQueryScript(installation.bundleId, query),
  );

  return parseSerializedRecords(rawOutput)
    .map((record) => busyCalItemFromRecord(record, "task"))
    .filter((item) => item.id.length > 0);
}

/**
 * Finds the next available BusyCal slot matching the request.
 *
 * - Parameters:
 *   - installation: The BusyCal install that should answer the query.
 *   - query: Availability constraints normalized from Raycast form state.
 * - Returns: The next available slot, or `null` when BusyCal finds none.
 */
export async function findNextBusyCalAvailable(
  installation: BusyCalInstallation,
  query: BusyCalNextAvailableQuery,
): Promise<BusyCalNextAvailableResult | null> {
  const parameters = [
    query.startDate
      ? `startDate:${appleScriptString(query.startDate)}`
      : undefined,
    query.endDate ? `endDate:${appleScriptString(query.endDate)}` : undefined,
    query.calendarIDs?.length
      ? `calendarIDs:${appleScriptString(query.calendarIDs.join(","))}`
      : undefined,
    `minimumDurationMinutes:${query.minimumDurationMinutes}`,
    `respectWorkingHours:${query.respectWorkingHours ? "true" : "false"}`,
  ]
    .filter(Boolean)
    .join(", ");

  const script = `
tell application id ${appleScriptString(installation.bundleId)}
  set availabilityResult to find next available given ${parameters}
end tell
if availabilityResult is missing value then
  return ""
end if
set serializedFields to {¬
  my emitDateField("startDate", startDate of availabilityResult), ¬
  my emitDateField("endDate", endDate of availabilityResult), ¬
  my emitField("timeZoneIdentifier", timeZoneIdentifier of availabilityResult)}
return my emitFields(serializedFields)
`;

  const rawOutput = await runBusyCalScript(installation, script);
  if (!rawOutput.trim()) {
    return null;
  }

  const [record] = parseSerializedRecords(rawOutput);
  if (!record) {
    return null;
  }

  return {
    startDate: record.startDate ?? "",
    endDate: record.endDate ?? "",
    timeZoneIdentifier: emptyToUndefined(record.timeZoneIdentifier),
  };
}

/**
 * Creates one structured BusyCal event.
 *
 * - Parameters:
 *   - installation: The BusyCal install that should create the event.
 *   - input: Structured event payload already validated by the Raycast form layer.
 * - Returns: The BusyCal item returned by the app after creation.
 */
export async function createBusyCalEvent(
  installation: BusyCalInstallation,
  input: BusyCalEventInput,
): Promise<BusyCalItem> {
  const rawOutput = await runBusyCalScript(
    installation,
    buildCreateBusyCalEventScript(installation.bundleId, input),
  );
  const [record] = parseSerializedRecords(rawOutput);
  if (!record) {
    throw new Error("BusyCal did not return the created event.");
  }

  return busyCalItemFromRecord(record, "event");
}

/**
 * Creates one structured BusyCal task.
 *
 * - Parameters:
 *   - installation: The BusyCal install that should create the task.
 *   - input: Structured task payload already validated by the Raycast form layer.
 * - Returns: The BusyCal item returned by the app after creation.
 */
export async function createBusyCalTask(
  installation: BusyCalInstallation,
  input: BusyCalTaskInput,
): Promise<BusyCalItem> {
  const rawOutput = await runBusyCalScript(
    installation,
    buildCreateBusyCalTaskScript(installation.bundleId, input),
  );
  const [record] = parseSerializedRecords(rawOutput);
  if (!record) {
    throw new Error("BusyCal did not return the created task.");
  }

  return busyCalItemFromRecord(record, "task");
}

/**
 * Creates one BusyCal item through the app's natural-language quick-entry automation command.
 *
 * - Parameters:
 *   - installation: The BusyCal install that should handle the quick-entry parse.
 *   - input: BusyCal's natural-language request payload.
 * - Returns: The BusyCal item returned by the app after quick add.
 * - Throws: When the installed BusyCal build does not yet expose the command.
 */
export async function createBusyCalNaturalLanguageItem(
  installation: BusyCalInstallation,
  input: BusyCalNaturalLanguageItemInput,
): Promise<BusyCalItem> {
  let rawOutput: string;
  try {
    rawOutput = await runBusyCalScript(
      installation,
      buildCreateBusyCalNaturalLanguageItemScript(installation.bundleId, input),
    );
  } catch (error) {
    if (await isUnsupportedNaturalLanguageCommandError(installation, error)) {
      throw new Error("BusyCal 2026.1.3 or later is required for Quick Add.");
    }

    throw error;
  }

  const [record] = parseSerializedRecords(rawOutput);
  if (!record) {
    throw new Error("BusyCal did not return the created quick-add item.");
  }

  return busyCalItemFromRecord(record, input.itemType);
}

/**
 * Reveals one BusyCal item through the app's canonical automation command.
 *
 * - Parameters:
 *   - installation: The BusyCal install that should reveal the item.
 *   - itemID: Canonical BusyCal item identity.
 * - Returns: The item BusyCal reported as revealed.
 */
export async function openBusyCalAutomationItem(
  installation: BusyCalInstallation,
  itemID: string,
): Promise<BusyCalItem> {
  const rawOutput = await runBusyCalScript(
    installation,
    buildOpenBusyCalItemScript(installation.bundleId, itemID),
  );
  const [record] = parseSerializedRecords(rawOutput);
  if (!record) {
    throw new Error("BusyCal did not confirm the revealed item.");
  }

  return busyCalItemFromRecord(record);
}

/**
 * Deletes one BusyCal event by item identifier.
 *
 * - Parameters:
 *   - installation: The BusyCal install that should perform the deletion.
 *   - itemID: Canonical BusyCal event identity.
 */
export async function deleteBusyCalEvent(
  installation: BusyCalInstallation,
  itemID: string,
): Promise<void> {
  const script = `
tell application id ${appleScriptString(installation.bundleId)}
  delete event given itemID:${appleScriptString(itemID)}
end tell
return "ok"
`;

  await runBusyCalScript(installation, script);
}

/**
 * Deletes one BusyCal task by item identifier.
 *
 * - Parameters:
 *   - installation: The BusyCal install that should perform the deletion.
 *   - itemID: Canonical BusyCal task identity.
 */
export async function deleteBusyCalTask(
  installation: BusyCalInstallation,
  itemID: string,
): Promise<void> {
  const script = `
tell application id ${appleScriptString(installation.bundleId)}
  delete task given itemID:${appleScriptString(itemID)}
end tell
return "ok"
`;

  await runBusyCalScript(installation, script);
}

export {
  buildBusyCalItemsQueryScript,
  buildBusyCalTasksQueryScript,
  buildCreateBusyCalEventScript,
  buildCreateBusyCalTaskScript,
  buildCreateBusyCalNaturalLanguageItemScript,
  buildOpenBusyCalItemScript,
} from "./busycal-script-builders";
export { busyCalItemFromRecord } from "./busycal-item-record";
export { isUnsupportedNaturalLanguageCommandError } from "./busycal-command-support";

function emptyToUndefined(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}
