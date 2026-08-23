import type { PreparedBulkResult, PublishedBulkResult } from "../types";

export function formatPublishResults(
  prepared: PreparedBulkResult[],
  published: PublishedBulkResult[],
): string {
  const lines: string[] = ["# Publish Result", ""];

  const successCount = published.filter((r) => r.status === "success").length;
  const conflictCount = published.filter((r) => r.status === "conflict").length;
  const errorCount = published.filter((r) => r.status === "error").length;
  const noOpCount = published.filter((r) => r.status === "no-op").length;

  lines.push(`- Success: ${successCount}`);
  if (noOpCount > 0) lines.push(`- No-op: ${noOpCount}`);
  if (conflictCount > 0) lines.push(`- Conflict: ${conflictCount}`);
  if (errorCount > 0) lines.push(`- Error: ${errorCount}`);
  lines.push("");

  for (const result of published) {
    const statusIcon =
      result.status === "success"
        ? "ok"
        : result.status === "no-op"
          ? "skip"
          : "FAIL";
    lines.push(
      `- ${result.project.displayName} [${statusIcon}]${result.error ? ` — ${result.error}` : ""}${result.changes.length > 0 ? `: ${result.changes.join(", ")}` : ""}`,
    );
  }

  return lines.join("\n");
}
