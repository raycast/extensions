import { Action, ActionPanel, Detail, Keyboard } from "@raycast/api";

import { CodeSearchHit } from "../types";
import { buildServiceNowUrl } from "../utils/buildServiceNowUrl";

function escapeBackticks(text: string): string {
  return text.replace(/```/g, "``​`");
}

function fenceLanguage(field: string): string {
  const f = field.toLowerCase();
  if (f.includes("html") || f.includes("template") || f === "body" || f === "message") return "html";
  if (f.includes("css") || f.includes("style")) return "css";
  if (f.includes("xml")) return "xml";
  if (f.includes("json")) return "json";
  if (f.includes("sql") || f.includes("query")) return "sql";
  return "js";
}

function buildMarkdown(hit: CodeSearchHit, tableLabel: string): string {
  const lines: string[] = [];
  lines.push(`## ${hit.name || "(unnamed)"}`);
  lines.push(`**${tableLabel}** · \`${hit.className}\``);
  lines.push("");

  for (const match of hit.matches) {
    if (!match.lineMatches?.length) continue;
    lines.push(`### ${match.fieldLabel}`);
    const lang = fenceLanguage(match.field);
    const sorted = [...match.lineMatches].sort((a, b) => a.line - b.line);
    const maxLineNumber = Math.max(...sorted.map((l) => l.line), 1);
    const pad = String(maxLineNumber).length;

    let prevLine = -Infinity;
    let inFence = false;
    for (const lm of sorted) {
      if (lm.line > prevLine + 1) {
        if (inFence) lines.push("```");
        lines.push("```" + lang);
        inFence = true;
      }
      const num = String(lm.line).padStart(pad, " ");
      lines.push(`${num}: ${escapeBackticks(lm.context ?? "")}`);
      prevLine = lm.line;
    }
    if (inFence) lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

export default function CodeMatchDetail({
  hit,
  tableLabel,
  instanceName,
}: {
  hit: CodeSearchHit;
  tableLabel: string;
  instanceName: string;
}) {
  const recordUrl = `/${hit.className}.do?sys_id=${hit.sysId}`;
  const url = buildServiceNowUrl(instanceName, recordUrl);

  return (
    <Detail
      navigationTitle={`${tableLabel} > ${hit.name || hit.sysId}`}
      markdown={buildMarkdown(hit, tableLabel)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in ServiceNow" url={url} icon={{ source: "servicenow.svg" }} />
          <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.CopyPath} />
        </ActionPanel>
      }
    />
  );
}
