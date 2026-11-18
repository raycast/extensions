import { CATEGORY_META } from "../types";
import type { ScanResult } from "../types";
import { formatBytes } from "./disk";

export function buildDetailMarkdown(result: ScanResult): string {
  const lines: string[] = [];

  lines.push(`## ${result.title}`);
  lines.push("");
  lines.push(result.description);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`**Size:** \`${formatBytes(result.size)}\``);
  lines.push("");
  if (result.itemCount !== undefined) {
    lines.push(`**Items:** ${result.itemCount}`);
    lines.push("");
  }
  lines.push(`**Category:** ${CATEGORY_META[result.category].title}`);
  lines.push("");
  lines.push(`**Risk:** ${result.risk === "safe" ? "Safe to clean" : "Review before cleaning"}`);
  lines.push("");
  lines.push(`**Path:** \`${result.path}\``);
  lines.push("");
  lines.push("**Clean command:**");
  lines.push("```bash");
  lines.push(result.cleanCommand);
  lines.push("```");

  if (result.requiresTool) {
    lines.push("");
    lines.push(`> Requires \`${result.requiresTool}\` to be installed.`);
  }

  if (result.risk === "moderate") {
    lines.push("");
    lines.push("> **Warning:** Review contents before cleaning. Some data may not be recoverable.");
  }

  return lines.join("\n");
}
