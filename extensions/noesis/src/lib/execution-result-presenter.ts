import {
  EngineExecutionResult,
  ReadingSummary,
  WorkflowExecutionResult,
} from "./types";

const MAX_ARRAY_ITEMS = 4;
const MAX_OBJECT_DEPTH = 2;
const RAW_PREVIEW_MAX_LENGTH = 2200;

export function buildEngineResultMarkdown(
  title: string,
  result: EngineExecutionResult,
  options: EngineResultPresentationOptions = {},
): string {
  const lines = [
    `# ${title}`,
    "",
    ...(options.contextLines?.length ? [...options.contextLines, ""] : []),
    result.witnessPrompt ?? "_No witness prompt returned._",
    "",
  ];

  const heroSection = buildEngineHeroSection(result, 2);
  if (heroSection.length > 0) {
    lines.push(...heroSection, "");
  }

  lines.push("## Reading Brief", "", ...buildEngineHighlightLines(result));

  if (
    options.requestPayload &&
    Object.keys(options.requestPayload).length > 0
  ) {
    lines.push(
      "",
      "## Request Context",
      "",
      ...buildStructuredBlock(options.requestPayload),
    );
  }

  lines.push("", "## Result Map", "", ...buildStructuredBlock(result.result));

  const extraMetadata = stripPresentationMetadata(result.metadata);
  if (Object.keys(extraMetadata).length > 0) {
    lines.push(
      "",
      "## Response Metadata",
      "",
      ...buildStructuredBlock(extraMetadata),
    );
  }

  lines.push(
    "",
    "## Raw Response Preview",
    "",
    "```json",
    safeJsonPreview(
      result.raw,
      options.rawPreviewMaxLength ?? RAW_PREVIEW_MAX_LENGTH,
    ),
    "```",
    "",
    "Use `Copy Result JSON` for the full payload.",
  );

  return compactMarkdown(lines).join("\n");
}

export function buildReadingResultMarkdown(
  reading: ReadingSummary,
  expanded = false,
): string {
  const normalized = toEngineExecutionResultFromReading(reading);

  return buildEngineResultMarkdown(
    truncate(reading.witnessPrompt, 60) || humanizeKey(reading.engineId),
    normalized,
    {
      requestPayload: extractReadingRequestContext(reading.payload),
      contextLines: [formatReadingContextLine(reading)],
      rawPreviewMaxLength: expanded ? 3200 : 1800,
    },
  );
}

export function buildWorkflowResultMarkdown(
  title: string,
  result: WorkflowExecutionResult,
  requestPayload?: Record<string, unknown>,
): string {
  const engineIds = Object.keys(result.engineOutputs);
  const lines = [
    `# ${title}`,
    "",
    result.timestamp
      ? `Completed ${formatAbsoluteTime(result.timestamp)}`
      : "Workflow complete.",
    "",
    "## Run Brief",
    "",
    `- Engine outputs returned: ${engineIds.length}`,
    `- Total time: ${formatCalculationTime(result.totalTimeMs)}`,
  ];

  const synthesisSummary = pickSummaryString(result.synthesis);
  if (synthesisSummary) {
    lines.push(`- Synthesis: ${synthesisSummary}`);
  }

  if (requestPayload && Object.keys(requestPayload).length > 0) {
    lines.push(
      "",
      "## Request Context",
      "",
      ...buildStructuredBlock(requestPayload),
    );
  }

  lines.push(
    "",
    "## Synthesis Map",
    "",
    ...buildStructuredBlock(result.synthesis),
  );

  if (engineIds.length > 0) {
    lines.push("", "## Engine Outputs", "");

    for (const [engineId, output] of Object.entries(result.engineOutputs)) {
      lines.push(`### ${humanizeKey(engineId)}`, "");

      if (output.witnessPrompt) {
        lines.push(output.witnessPrompt, "");
      }

      const heroSection = buildEngineHeroSection(output, 4);
      if (heroSection.length > 0) {
        lines.push(...heroSection, "");
      }

      const outputBrief = [
        output.consciousnessLevel !== undefined
          ? `- Consciousness: ${output.consciousnessLevel}`
          : null,
        output.timestamp
          ? `- Timestamp: ${formatAbsoluteTime(output.timestamp)}`
          : null,
        readMetadataTime(output.metadata) !== undefined
          ? `- Calculation time: ${formatCalculationTime(readMetadataTime(output.metadata))}`
          : null,
      ].filter(Boolean) as string[];

      if (outputBrief.length > 0) {
        lines.push(...outputBrief, "");
      }

      lines.push(...buildStructuredField("Result", output.result, 2), "");
    }
  }

  lines.push(
    "## Raw Response Preview",
    "",
    "```json",
    safeJsonPreview(result.raw, RAW_PREVIEW_MAX_LENGTH),
    "```",
    "",
    "Use `Copy Result JSON` for the full payload.",
  );

  return compactMarkdown(lines).join("\n");
}

export function listStructuredKeys(value: Record<string, unknown>): string[] {
  return Object.keys(value)
    .slice(0, 6)
    .map((key) => humanizeKey(key));
}

export function getReadingStructuredKeys(reading: ReadingSummary): string[] {
  return listStructuredKeys(toEngineExecutionResultFromReading(reading).result);
}

export function hasReadingRequestContext(reading: ReadingSummary): boolean {
  const requestPayload = extractReadingRequestContext(reading.payload);
  return Boolean(requestPayload && Object.keys(requestPayload).length > 0);
}

export function getReadingRequestJson(
  reading: ReadingSummary,
): string | undefined {
  const requestPayload = extractReadingRequestContext(reading.payload);
  return requestPayload && Object.keys(requestPayload).length > 0
    ? JSON.stringify(requestPayload, null, 2)
    : undefined;
}

function buildEngineHighlightLines(result: EngineExecutionResult): string[] {
  const payload = asRecord(result.result);
  const lines = [
    result.timestamp
      ? `- Completed: ${formatAbsoluteTime(result.timestamp)}`
      : null,
    result.consciousnessLevel !== undefined
      ? `- Consciousness: ${result.consciousnessLevel}`
      : null,
    readMetadataTime(result.metadata) !== undefined
      ? `- Calculation time: ${formatCalculationTime(readMetadataTime(result.metadata))}`
      : null,
    buildNestedLine(payload, ["current_organ", "organ"], "Current organ"),
    buildNestedLine(payload, ["current_dosha", "dosha"], "Current dosha"),
    buildNestedLine(payload, ["current_organ", "time_window"], "Active window"),
    buildNestedLine(
      payload,
      ["current_period", "mahadasha", "planet"],
      "Maha dasha",
    ),
    buildNestedLine(
      payload,
      ["current_period", "antardasha", "planet"],
      "Antar dasha",
    ),
    buildNestedLine(
      payload,
      ["current_period", "pratyantardasha", "planet"],
      "Praty dasha",
    ),
    typeof readNumber(payload, "overall_energy") === "number"
      ? `- Overall energy: ${Math.round(readNumber(payload, "overall_energy") ?? 0)}%`
      : null,
    pickSummaryLine(payload),
  ].filter(Boolean) as string[];

  if (lines.length > 0) {
    return lines;
  }

  const keys = Object.keys(payload);
  return keys.length > 0
    ? [
        `- Top-level result fields: ${keys.map((key) => `\`${key}\``).join(", ")}`,
      ]
    : ["- No structured result fields returned."];
}

function buildEngineHeroSection(
  result: EngineExecutionResult,
  headingLevel: number,
): string[] {
  const headingPrefix = "#".repeat(Math.max(2, Math.min(4, headingLevel)));
  const payload = asRecord(result.result);

  switch (result.engineId) {
    case "vedic-clock":
      return buildTableSection(
        `${headingPrefix} Current Pulse`,
        [
          ["Organ", readNestedString(payload, ["current_organ", "organ"])],
          ["Dosha", readNestedString(payload, ["current_dosha", "dosha"])],
          [
            "Window",
            readNestedString(payload, ["current_organ", "time_window"]),
          ],
          ["Element", readNestedString(payload, ["current_organ", "element"])],
        ],
        readString(asRecord(payload.recommendation), "time_window") ??
          readString(asRecord(payload.current_organ), "peak_energy") ??
          readString(payload, "synthesis"),
      );
    case "biorhythm":
      return buildTableSection(`${headingPrefix} Energy Signature`, [
        ["Overall", formatPercent(readNumber(payload, "overall_energy"))],
        ["Physical", summarizeCycleValue(asRecord(payload.physical))],
        ["Emotional", summarizeCycleValue(asRecord(payload.emotional))],
        ["Intellectual", summarizeCycleValue(asRecord(payload.intellectual))],
      ]);
    case "vimshottari":
      return buildTableSection(
        `${headingPrefix} Dasha Focus`,
        [
          [
            "Maha",
            readNestedString(payload, [
              "current_period",
              "mahadasha",
              "planet",
            ]),
          ],
          [
            "Antar",
            readNestedString(payload, [
              "current_period",
              "antardasha",
              "planet",
            ]),
          ],
          [
            "Praty",
            readNestedString(payload, [
              "current_period",
              "pratyantardasha",
              "planet",
            ]),
          ],
          ["Next Shift", readUpcomingTransitionLabel(payload)],
        ],
        readString(asRecord(payload.period_enrichment), "combined_description"),
      );
    default:
      return [];
  }
}

function buildTableSection(
  title: string,
  rows: Array<[string, string | undefined]>,
  note?: string,
): string[] {
  const visibleRows = rows.filter(
    ([, value]) => typeof value === "string" && value.trim().length > 0,
  ) as Array<[string, string]>;
  if (visibleRows.length === 0) {
    return [];
  }

  const lines = [title, "", "| Signal | Value |", "| --- | --- |"];
  visibleRows.forEach(([label, value]) => {
    lines.push(
      `| ${escapeTableCell(label)} | ${escapeTableCell(truncate(value, 120))} |`,
    );
  });

  if (note) {
    lines.push("", truncate(note, 220));
  }

  return lines;
}

function readUpcomingTransitionLabel(
  payload: Record<string, unknown>,
): string | undefined {
  const transitions = payload.upcoming_transitions;
  if (!Array.isArray(transitions) || transitions.length === 0) {
    return undefined;
  }

  const first = asRecord(transitions[0]);
  const level = readString(first, "type");
  const daysUntil = readNumber(first, "days_until");
  const planet = readString(first, "to_planet");

  const parts = [
    level,
    typeof daysUntil === "number" ? `${Math.round(daysUntil)}d` : undefined,
    planet,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function summarizeCycleValue(
  cycle: Record<string, unknown>,
): string | undefined {
  if (Object.keys(cycle).length === 0) {
    return undefined;
  }

  const phase = readString(cycle, "phase");
  const percentage = formatPercent(readNumber(cycle, "percentage"));
  return (
    [phase, percentage !== "--" ? percentage : undefined]
      .filter(Boolean)
      .join(" · ") || undefined
  );
}

function formatPercent(value: number | undefined): string {
  return typeof value === "number" ? `${Math.round(value)}%` : "--";
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function toEngineExecutionResultFromReading(
  reading: ReadingSummary,
): EngineExecutionResult {
  const payload = asRecord(reading.payload);
  const rawMetadata = asRecord(payload.metadata);
  const resultRecord = extractReadingResultRecord(payload);

  return {
    engineId: reading.engineId,
    result: resultRecord,
    witnessPrompt:
      reading.witnessPrompt ?? readString(payload, "witness_prompt"),
    consciousnessLevel:
      reading.consciousnessLevel ?? readNumber(payload, "consciousness_level"),
    metadata: {
      ...rawMetadata,
      ...(reading.calculationTimeMs !== undefined
        ? { calculation_time_ms: reading.calculationTimeMs }
        : {}),
    },
    timestamp:
      readString(payload, "timestamp") ??
      readString(payload, "created_at") ??
      reading.createdAt,
    raw: payload,
  };
}

function extractReadingResultRecord(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const directResult = asRecord(payload.result);
  if (Object.keys(directResult).length > 0) {
    return directResult;
  }

  const resultData = asRecord(payload.result_data);
  if (Object.keys(resultData).length > 0) {
    return resultData;
  }

  const ignoredKeys = new Set([
    "id",
    "engine_id",
    "workflow_id",
    "input_hash",
    "witness_prompt",
    "consciousness_level",
    "calculation_time_ms",
    "created_at",
    "fetched_at",
    "metadata",
    "timestamp",
    "result",
    "result_data",
    "birth_data",
    "current_time",
    "precision",
    "options",
    "input",
    "input_data",
  ]);

  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => !ignoredKeys.has(key)),
  );
}

function extractReadingRequestContext(
  payloadValue: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const payload = asRecord(payloadValue);

  const directInput = asRecord(payload.input);
  if (Object.keys(directInput).length > 0) {
    return directInput;
  }

  const inputData = asRecord(payload.input_data);
  if (Object.keys(inputData).length > 0) {
    return inputData;
  }

  const birthData = asRecord(payload.birth_data);
  const options = asRecord(payload.options);
  const currentTime = readString(payload, "current_time");
  const precision = readString(payload, "precision");

  const requestPayload = {
    ...(Object.keys(birthData).length > 0 ? { birth_data: birthData } : {}),
    ...(currentTime ? { current_time: currentTime } : {}),
    ...(precision ? { precision } : {}),
    ...(Object.keys(options).length > 0 ? { options } : {}),
  };

  return Object.keys(requestPayload).length > 0 ? requestPayload : undefined;
}

function formatReadingContextLine(reading: ReadingSummary): string {
  return [reading.engineId, reading.workflowId].filter(Boolean).join(" · ");
}

function pickSummaryLine(payload: Record<string, unknown>): string | null {
  const candidate =
    readString(payload, "synthesis") ??
    readString(payload, "summary") ??
    readString(asRecord(payload.period_enrichment), "combined_description") ??
    readString(asRecord(payload.recommendation), "time_window");

  return candidate ? `- Summary: ${truncate(candidate, 180)}` : null;
}

function buildStructuredBlock(value: unknown): string[] {
  if (isRecord(value)) {
    return buildStructuredObject(value, 0);
  }

  if (Array.isArray(value)) {
    return buildStructuredArray("Items", value, 0);
  }

  return [`- ${formatInlineValue(value)}`];
}

function buildStructuredObject(
  record: Record<string, unknown>,
  depth: number,
): string[] {
  const primitiveEntries: Array<[string, unknown]> = [];
  const nestedEntries: Array<[string, unknown]> = [];

  for (const [key, value] of Object.entries(record)) {
    if (isInlineValue(value)) {
      primitiveEntries.push([key, value]);
    } else {
      nestedEntries.push([key, value]);
    }
  }

  const lines: string[] = [];

  if (primitiveEntries.length === 0 && nestedEntries.length === 0) {
    return ["- No structured fields returned."];
  }

  for (const [key, value] of primitiveEntries) {
    lines.push(`- ${humanizeKey(key)}: ${formatInlineValue(value)}`);
  }

  for (const [key, value] of nestedEntries) {
    if (depth >= MAX_OBJECT_DEPTH) {
      lines.push(`- ${humanizeKey(key)}: ${buildValuePreview(value)}`);
      continue;
    }

    lines.push("", ...buildStructuredField(humanizeKey(key), value, depth + 1));
  }

  return compactMarkdown(lines);
}

function buildStructuredField(
  label: string,
  value: unknown,
  depth: number,
): string[] {
  const heading = `${"#".repeat(Math.min(4, depth + 2))} ${label}`;

  if (Array.isArray(value)) {
    return [heading, "", ...buildStructuredArray(label, value, depth)];
  }

  if (isRecord(value)) {
    return [heading, "", ...buildStructuredObject(value, depth)];
  }

  return [heading, "", `- ${formatInlineValue(value)}`];
}

function buildStructuredArray(
  label: string,
  items: unknown[],
  depth: number,
): string[] {
  if (items.length === 0) {
    return ["- No items returned."];
  }

  if (items.every((item) => isInlineValue(item))) {
    return items
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => `- ${formatInlineValue(item)}`)
      .concat(
        items.length > MAX_ARRAY_ITEMS
          ? [`- ${items.length - MAX_ARRAY_ITEMS} more item(s) not shown.`]
          : [],
      );
  }

  const lines: string[] = [];
  const visibleItems = items.slice(0, MAX_ARRAY_ITEMS);

  visibleItems.forEach((item, index) => {
    const itemLabel = singularize(label);
    lines.push(`**${itemLabel} ${index + 1}**`);

    if (isRecord(item)) {
      lines.push(...buildStructuredObject(item, depth + 1));
    } else if (Array.isArray(item)) {
      lines.push(...buildStructuredArray(itemLabel, item, depth + 1));
    } else {
      lines.push(`- ${formatInlineValue(item)}`);
    }

    if (index < visibleItems.length - 1) {
      lines.push("");
    }
  });

  if (items.length > MAX_ARRAY_ITEMS) {
    lines.push(
      "",
      `- ${items.length - MAX_ARRAY_ITEMS} more item(s) not shown.`,
    );
  }

  return compactMarkdown(lines);
}

function safeJsonPreview(value: unknown, maxLength: number): string {
  const content = JSON.stringify(value, null, 2) ?? "null";
  return content.length > maxLength
    ? `${content.slice(0, maxLength - 1)}…`
    : content;
}

function buildNestedLine(
  payload: Record<string, unknown>,
  path: string[],
  label: string,
): string | null {
  const value = readNestedString(payload, path);
  return value ? `- ${label}: ${truncate(value, 180)}` : null;
}

function readNestedString(
  payload: Record<string, unknown>,
  path: string[],
): string | undefined {
  let current: unknown = payload;

  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }

  return typeof current === "string" && current.trim() ? current : undefined;
}

function readNumber(
  payload: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readString(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readMetadataTime(
  metadata: Record<string, unknown>,
): number | undefined {
  const direct = metadata.calculation_time_ms;
  return typeof direct === "number" ? direct : undefined;
}

function stripPresentationMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const rest = { ...metadata };
  delete rest.calculation_time_ms;
  return rest;
}

function pickSummaryString(
  record: Record<string, unknown>,
): string | undefined {
  for (const key of ["summary", "overview", "message", "guidance"]) {
    const value = readString(record, key);
    if (value) {
      return truncate(value, 200);
    }
  }

  const firstLongString = Object.values(record).find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
  return firstLongString ? truncate(firstLongString, 200) : undefined;
}

function buildValuePreview(value: unknown): string {
  if (Array.isArray(value)) {
    return `${value.length} item(s)`;
  }

  if (isRecord(value)) {
    return `${Object.keys(value).length} field(s)`;
  }

  return formatInlineValue(value);
}

function formatInlineValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((entry) => formatInlineValue(entry))
      .join(", ");
  }

  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? String(value)
      : value.toFixed(value < 10 ? 2 : 1);
  }

  if (typeof value === "string") {
    return truncate(value, 180);
  }

  return buildValuePreview(value);
}

function humanizeKey(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function singularize(label: string): string {
  return label.endsWith("s") && label.length > 3 ? label.slice(0, -1) : label;
}

function isInlineValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    (Array.isArray(value) && value.every((entry) => isPrimitive(entry)))
  );
}

function isPrimitive(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function compactMarkdown(lines: string[]): string[] {
  const compact: string[] = [];

  for (const line of lines) {
    if (line === "" && compact[compact.length - 1] === "") {
      continue;
    }
    compact.push(line);
  }

  if (compact[compact.length - 1] === "") {
    compact.pop();
  }

  return compact;
}

function truncate(value: string | undefined, maxLength = 80): string {
  if (!value) {
    return "";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function formatAbsoluteTime(value?: string): string {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatCalculationTime(milliseconds?: number): string {
  if (
    typeof milliseconds !== "number" ||
    !Number.isFinite(milliseconds) ||
    milliseconds <= 0
  ) {
    return "Unavailable";
  }

  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  }

  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}

interface EngineResultPresentationOptions {
  requestPayload?: Record<string, unknown>;
  contextLines?: string[];
  rawPreviewMaxLength?: number;
}
