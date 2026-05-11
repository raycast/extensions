import { CATEGORY_META } from "../types";
import type { TweakState } from "../types";
import { getCommandString, getResetCommandString } from "./defaults";

export function formatValue(tweak: TweakState): string {
  if (tweak.type === "boolean") {
    return tweak.currentValue ? "On" : "Off";
  }
  if (tweak.type === "enum" && tweak.options) {
    const match = tweak.options.find((o) => String(o.value) === String(tweak.currentValue));
    return match?.title ?? String(tweak.currentValue);
  }
  return String(tweak.currentValue);
}

export function formatDefault(tweak: TweakState): string {
  if (tweak.type === "boolean") {
    return tweak.defaultValue ? "On" : "Off";
  }
  if (tweak.type === "enum" && tweak.options) {
    const match = tweak.options.find((o) => String(o.value) === String(tweak.defaultValue));
    return match?.title ?? String(tweak.defaultValue);
  }
  return String(tweak.defaultValue);
}

export function buildDetailMarkdown(tweak: TweakState, options?: { showCategory?: boolean }): string {
  const lines: string[] = [];

  lines.push(`## ${tweak.title}`);
  lines.push("");
  lines.push(tweak.description);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`**Status:** ${tweak.isModified ? "Modified" : "Default"}`);
  lines.push("");
  lines.push(`**Current Value:** \`${formatValue(tweak)}\``);
  lines.push("");
  lines.push(`**Default Value:** \`${formatDefault(tweak)}\``);
  lines.push("");

  if (options?.showCategory) {
    lines.push(`**Category:** ${CATEGORY_META[tweak.category].title}`);
    lines.push("");
  }

  if (tweak.type === "enum" && tweak.options) {
    lines.push("**Options:**");
    for (const opt of tweak.options) {
      const marker = String(tweak.currentValue) === String(opt.value) ? " (current)" : "";
      lines.push(`- ${opt.title}${marker}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(`**Domain:** \`${tweak.domain}\``);
  lines.push("");
  lines.push(`**Key:** \`${tweak.key}\``);
  lines.push("");
  lines.push("**Command:**");
  lines.push("```bash");
  lines.push(getCommandString(tweak, tweak.currentValue));
  lines.push("```");
  lines.push("");
  lines.push("**Reset:**");
  lines.push("```bash");
  lines.push(getResetCommandString(tweak));
  lines.push("```");

  if (tweak.requiresRestart) {
    lines.push("");
    lines.push(`**Requires restart:** ${tweak.requiresRestart}`);
  }

  if (tweak.risk === "moderate") {
    lines.push("");
    lines.push("> **Warning:** This setting is marked as moderate risk.");
  }

  return lines.join("\n");
}
