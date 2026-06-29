import { environment } from "@raycast/api";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ChatTurn } from "./continue-chat";
import { modelTitleForValue } from "./model";
import { chatToMarkdown } from "./stored-sessions";
import { describeUsageForExport, estimateUsdForUsage, type TokenUsage } from "./token-usage";

function footerLines(modelValue: string, sessionUsage: TokenUsage | null): string {
  const lines = [`*Exported ${new Date().toISOString()} · ${modelTitleForValue(modelValue)}*`];
  if (sessionUsage) {
    const desc = describeUsageForExport(sessionUsage);
    const usd = estimateUsdForUsage(modelValue, sessionUsage);
    if (usd != null) {
      lines.push(`*Session: ${desc} · ~$${usd < 0.01 ? usd.toFixed(4) : usd.toFixed(2)}*`);
    } else {
      lines.push(`*Session: ${desc}*`);
    }
  }
  return lines.join("\n");
}

/**
 * Writes the conversation as Markdown under the extension support directory and reveals it in Finder (`open -R`).
 */
export function exportChatConversationToFile(
  messages: ChatTurn[],
  modelValue: string,
  sessionUsage: TokenUsage | null,
): void {
  const md = chatToMarkdown(messages, footerLines(modelValue, sessionUsage));
  const name = `read-my-screen-chat-${Date.now()}.md`;
  const outPath = join(environment.supportPath, name);
  writeFileSync(outPath, md, "utf8");
  execFileSync("open", ["-R", outPath]);
}
