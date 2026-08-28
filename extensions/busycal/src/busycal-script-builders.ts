import {
  appleScriptCSV,
  appleScriptString,
  buildGivenClause,
} from "./busycal-script";
import {
  BusyCalEventInput,
  BusyCalItemQuery,
  BusyCalNaturalLanguageItemInput,
  BusyCalTaskInput,
} from "./types";

/**
 * Builds the generic `query items` AppleScript used for mixed-type BusyCal queries.
 */
export function buildBusyCalItemsQueryScript(
  bundleId: string,
  query: BusyCalItemQuery,
): string {
  const itemTypesParameter =
    query.itemTypes && query.itemTypes.length > 0
      ? appleScriptCSV(query.itemTypes)
      : undefined;
  const parameters = buildGivenClause([
    query.searchText
      ? `searchText:${appleScriptString(query.searchText)}`
      : undefined,
    query.startDate
      ? `startDate:${appleScriptString(query.startDate)}`
      : undefined,
    query.endDate ? `endDate:${appleScriptString(query.endDate)}` : undefined,
    itemTypesParameter ? `itemTypes:${itemTypesParameter}` : undefined,
    query.fetchLimit !== undefined
      ? `fetchLimit:${query.fetchLimit}`
      : undefined,
  ]);
  const givenClause = parameters.length > 0 ? ` given ${parameters}` : "";

  return `
tell application id ${appleScriptString(bundleId)}
  set rawItems to query items${givenClause}
end tell
set serializedRecords to {}
repeat with itemRecord in rawItems
${buildOptionalPropertyRead("startDateValue", "startDate")}
${buildOptionalPropertyRead("endDateValue", "endDate")}
${buildOptionalPropertyRead("dueDateValue", "dueDate")}
${buildOptionalPropertyRead("locationValue", "location")}
${buildOptionalPropertyRead("seriesUIDValue", "seriesUID")}
${buildOptionalPropertyRead("occurrenceDateValue", "occurrenceDate")}
${buildOptionalPropertyRead("isFloatingValue", "isFloating")}
  set serializedFields to {¬
    my emitField("id", |id| of itemRecord), ¬
    my emitField("title", title of itemRecord), ¬
    my emitField("type", type of itemRecord), ¬
    my emitField("calendarID", calendarID of itemRecord), ¬
    my emitDateField("startDate", startDateValue), ¬
    my emitDateField("endDate", endDateValue), ¬
    my emitDateField("dueDate", dueDateValue), ¬
    my emitField("location", locationValue), ¬
    my emitField("seriesUID", seriesUIDValue), ¬
    my emitDateField("occurrenceDate", occurrenceDateValue), ¬
    my emitBooleanField("isFloating", isFloatingValue)}
  set end of serializedRecords to my emitFields(serializedFields)
end repeat
return my emitRecords(serializedRecords)
`;
}

/**
 * Builds the `query tasks` AppleScript used for task-only BusyCal queries.
 */
export function buildBusyCalTasksQueryScript(
  bundleId: string,
  query: BusyCalItemQuery,
): string {
  const parameters = buildGivenClause([
    query.searchText
      ? `searchText:${appleScriptString(query.searchText)}`
      : undefined,
    query.startDate
      ? `startDate:${appleScriptString(query.startDate)}`
      : undefined,
    query.endDate ? `endDate:${appleScriptString(query.endDate)}` : undefined,
    query.fetchLimit !== undefined
      ? `fetchLimit:${query.fetchLimit}`
      : undefined,
  ]);
  const givenClause = parameters.length > 0 ? ` given ${parameters}` : "";
  return `
tell application id ${appleScriptString(bundleId)}
  set rawItems to query tasks${givenClause}
end tell
set serializedRecords to {}
repeat with itemRecord in rawItems
${buildOptionalPropertyRead("dueDateValue", "dueDate")}
${buildOptionalPropertyRead("occurrenceDateValue", "occurrenceDate")}
${buildOptionalPropertyRead("isFloatingValue", "isFloating")}
  set serializedFields to {¬
    my emitField("id", |id| of itemRecord), ¬
    my emitField("title", title of itemRecord), ¬
    my emitField("calendarID", calendarID of itemRecord), ¬
    my emitDateField("dueDate", dueDateValue), ¬
    my emitField("seriesUID", seriesUID of itemRecord), ¬
    my emitDateField("occurrenceDate", occurrenceDateValue), ¬
    my emitBooleanField("isFloating", isFloatingValue)}
  set end of serializedRecords to my emitFields(serializedFields)
end repeat
return my emitRecords(serializedRecords)
`;
}

/**
 * Builds the BusyCal AppleScript used to create one structured event.
 */
export function buildCreateBusyCalEventScript(
  bundleId: string,
  input: BusyCalEventInput,
): string {
  const parameters = buildGivenClause([
    `title:${appleScriptString(input.title)}`,
    `startDate:${appleScriptString(input.startDate)}`,
    `endDate:${appleScriptString(input.endDate)}`,
    input.calendarID
      ? `calendarID:${appleScriptString(input.calendarID)}`
      : undefined,
    `allDay:${input.allDay ? "true" : "false"}`,
    input.location
      ? `location:${appleScriptString(input.location)}`
      : undefined,
    input.notes ? `notes:${appleScriptString(input.notes)}` : undefined,
  ]);

  return `
tell application id ${appleScriptString(bundleId)}
  set createdEvent to create event given ${parameters}
end tell
${buildOptionalPropertyRead("locationValue", "location", "createdEvent", "")}
${buildOptionalPropertyRead("occurrenceDateValue", "occurrenceDate", "createdEvent", "")}
${buildOptionalPropertyRead("isFloatingValue", "isFloating", "createdEvent", "")}
set serializedFields to {¬
  my emitField("id", |id| of createdEvent), ¬
  my emitField("title", title of createdEvent), ¬
  my emitField("type", "event"), ¬
  my emitField("calendarID", calendarID of createdEvent), ¬
  my emitDateField("startDate", startDate of createdEvent), ¬
  my emitDateField("endDate", endDate of createdEvent), ¬
  my emitField("location", locationValue), ¬
  my emitField("seriesUID", seriesUID of createdEvent), ¬
  my emitDateField("occurrenceDate", occurrenceDateValue), ¬
  my emitBooleanField("isFloating", isFloatingValue)}
return my emitFields(serializedFields)
`;
}

/**
 * Builds the BusyCal AppleScript used to create one structured task.
 */
export function buildCreateBusyCalTaskScript(
  bundleId: string,
  input: BusyCalTaskInput,
): string {
  const parameters = buildGivenClause([
    `title:${appleScriptString(input.title)}`,
    input.dueDate ? `dueDate:${appleScriptString(input.dueDate)}` : undefined,
    input.calendarID
      ? `calendarID:${appleScriptString(input.calendarID)}`
      : undefined,
    input.notes ? `notes:${appleScriptString(input.notes)}` : undefined,
  ]);

  return `
tell application id ${appleScriptString(bundleId)}
  set createdTask to create task given ${parameters}
end tell
${buildOptionalPropertyRead("dueDateValue", "dueDate", "createdTask", "")}
${buildOptionalPropertyRead("occurrenceDateValue", "occurrenceDate", "createdTask", "")}
${buildOptionalPropertyRead("isFloatingValue", "isFloating", "createdTask", "")}
set serializedFields to {¬
  my emitField("id", |id| of createdTask), ¬
  my emitField("title", title of createdTask), ¬
  my emitField("type", "task"), ¬
  my emitField("calendarID", calendarID of createdTask), ¬
  my emitDateField("dueDate", dueDateValue), ¬
  my emitField("seriesUID", seriesUID of createdTask), ¬
  my emitDateField("occurrenceDate", occurrenceDateValue), ¬
  my emitBooleanField("isFloating", isFloatingValue)}
return my emitFields(serializedFields)
`;
}

/**
 * Builds the BusyCal AppleScript used to create one natural-language item.
 */
export function buildCreateBusyCalNaturalLanguageItemScript(
  bundleId: string,
  input: BusyCalNaturalLanguageItemInput,
): string {
  const parameters = buildGivenClause([
    `text:${appleScriptString(input.text)}`,
    `itemType:${appleScriptString(input.itemType)}`,
    input.calendarID
      ? `calendarID:${appleScriptString(input.calendarID)}`
      : undefined,
    input.notes ? `notes:${appleScriptString(input.notes)}` : undefined,
  ]);

  return `
tell application id ${appleScriptString(bundleId)}
  set createdItem to create natural language item given ${parameters}
end tell
${buildOptionalPropertyRead("startDateValue", "startDate", "createdItem", "")}
${buildOptionalPropertyRead("endDateValue", "endDate", "createdItem", "")}
${buildOptionalPropertyRead("dueDateValue", "dueDate", "createdItem", "")}
${buildOptionalPropertyRead("locationValue", "location", "createdItem", "")}
${buildOptionalPropertyRead("seriesUIDValue", "seriesUID", "createdItem", "")}
${buildOptionalPropertyRead("occurrenceDateValue", "occurrenceDate", "createdItem", "")}
${buildOptionalPropertyRead("isFloatingValue", "isFloating", "createdItem", "")}
set serializedFields to {¬
  my emitField("id", |id| of createdItem), ¬
  my emitField("title", title of createdItem), ¬
  my emitField("type", |type| of createdItem), ¬
  my emitField("calendarID", calendarID of createdItem), ¬
  my emitDateField("startDate", startDateValue), ¬
  my emitDateField("endDate", endDateValue), ¬
  my emitDateField("dueDate", dueDateValue), ¬
  my emitField("location", locationValue), ¬
  my emitField("seriesUID", seriesUIDValue), ¬
  my emitDateField("occurrenceDate", occurrenceDateValue), ¬
  my emitBooleanField("isFloating", isFloatingValue)}
return my emitFields(serializedFields)
`;
}

/**
 * Builds the BusyCal AppleScript used to reveal one structured item by canonical identity.
 *
 * - Parameters:
 *   - bundleId: Bundle identifier for the target BusyCal install.
 *   - itemID: Canonical BusyCal item identity.
 * - Returns: The full AppleScript used to reveal and serialize the item.
 */
export function buildOpenBusyCalItemScript(
  bundleId: string,
  itemID: string,
): string {
  return `
tell application id ${appleScriptString(bundleId)}
  set openedItem to open item given itemID:${appleScriptString(itemID)}
end tell
${buildOptionalRecordPropertyRead("startDateValue", "startDate")}
${buildOptionalRecordPropertyRead("endDateValue", "endDate")}
${buildOptionalRecordPropertyRead("dueDateValue", "dueDate")}
${buildOptionalRecordPropertyRead("locationValue", "location")}
${buildOptionalRecordPropertyRead("seriesUIDValue", "seriesUID")}
${buildOptionalRecordPropertyRead("occurrenceDateValue", "occurrenceDate")}
${buildOptionalRecordPropertyRead("isFloatingValue", "isFloating")}
set serializedFields to {¬
  my emitField("id", |id| of openedItem), ¬
  my emitField("title", title of openedItem), ¬
  my emitField("type", |type| of openedItem), ¬
  my emitField("calendarID", calendarID of openedItem), ¬
  my emitDateField("startDate", startDateValue), ¬
  my emitDateField("endDate", endDateValue), ¬
  my emitDateField("dueDate", dueDateValue), ¬
  my emitField("location", locationValue), ¬
  my emitField("seriesUID", seriesUIDValue), ¬
  my emitDateField("occurrenceDate", occurrenceDateValue), ¬
  my emitBooleanField("isFloating", isFloatingValue)}
return my emitFields(serializedFields)
`;
}

/**
 * Builds one guarded AppleScript property read.
 *
 * BusyCal record shapes differ between events, tasks, and natural-language
 * create results, so optional property reads must be wrapped in `try` blocks to
 * keep the serializer from crashing after a successful mutation.
 */
function buildOptionalPropertyRead(
  variableName: string,
  propertyName: string,
  recordName = "itemRecord",
  indent = "  ",
): string {
  return `${indent}set ${variableName} to missing value
${indent}try
${indent}  set ${variableName} to ${propertyName} of ${recordName}
${indent}end try`;
}

/**
 * Reads one optional property from the revealed BusyCal record without assuming event/task parity.
 */
function buildOptionalRecordPropertyRead(
  variableName: string,
  propertyName: string,
): string {
  return `set ${variableName} to missing value
try
  set ${variableName} to ${propertyName} of openedItem
end try`;
}
