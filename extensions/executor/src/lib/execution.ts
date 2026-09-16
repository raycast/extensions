import type { ExecutionResult } from "./types";

export function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** JSON literals keep addresses and inputs out of executable syntax. */
export function toolCallCode(address: string, args: Record<string, unknown>): string {
  const path = address.replace(/^tools\./, "");
  if (!path || path.split(".").some((part) => !part || ["__proto__", "constructor", "prototype"].includes(part))) {
    throw new Error("This tool has an invalid address.");
  }
  return `return await tools[${JSON.stringify(path)}](JSON.parse(${JSON.stringify(JSON.stringify(args))}));`;
}

export function pausedInteraction(result: ExecutionResult) {
  if (result.status !== "paused") return undefined;
  const payload = record(result.structured);
  const interaction = record(payload?.interaction);
  if (typeof payload?.executionId !== "string" || !payload.executionId || !interaction) return undefined;
  return { executionId: payload.executionId, interaction };
}

export function executionValue(result: ExecutionResult): unknown {
  const structured = record(result.structured);
  return structured && Object.hasOwn(structured, "result") ? structured.result : result.structured;
}

export function executionFailed(result: ExecutionResult): boolean {
  if (result.status === "paused") return false;
  return result.isError || record(executionValue(result))?.ok === false;
}

export function safeBrowserUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return !url.username && !url.password && (url.protocol === "https:" || (local && url.protocol === "http:"))
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function resultRows(value: unknown): Record<string, unknown>[] | undefined {
  const payload = record(value)?.ok === true ? record(value)?.data : value;
  if (!Array.isArray(payload) || !payload.length || !payload.every((item) => record(item))) return undefined;
  return payload as Record<string, unknown>[];
}

export function resultTable(value: unknown): string | undefined {
  const rows = resultRows(value);
  if (!rows) return undefined;
  const columns = Array.from(new Set(rows.slice(0, 20).flatMap((row) => Object.keys(row)))).slice(0, 5);
  if (!columns.length) return undefined;
  const cell = (v: unknown) =>
    String(v === undefined || v === null ? "" : typeof v === "object" ? JSON.stringify(v) : v)
      .slice(0, 160)
      .replace(/[\r\n]+/g, " ")
      .replace(/[\\|`*_<>[\]]/g, "\\$&");
  return [
    `Preview: ${Math.min(rows.length, 20)} of ${rows.length} rows. Full data is available in JSON.`,
    "",
    `| ${columns.map(cell).join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.slice(0, 20).map((row) => `| ${columns.map((column) => cell(row[column])).join(" | ")} |`),
  ].join("\n");
}
