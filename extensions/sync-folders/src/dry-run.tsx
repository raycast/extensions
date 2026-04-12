import { AI, Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { useSyncFolders } from "./hooks";
import { SyncFolders } from "./types";
import { executeDryRun } from "./utils";

function parseDryRunOutput(output: string): { added: string[]; deleted: string[]; updated: string[] } {
  const added: string[] = [];
  const deleted: string[] = [];
  const updated: string[] = [];

  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    if (line.startsWith(">f+")) added.push(line.substring(12).trim());
    else if (line.startsWith("*deleting")) deleted.push(line.replace("*deleting   ", "").trim());
    else if (line.startsWith(">f.")) updated.push(line.substring(12).trim());
  }

  return { added, deleted, updated };
}

function buildMarkdown(
  syncFolder: SyncFolders,
  result: { added: string[]; deleted: string[]; updated: string[] },
): string {
  let md = `#### Dry Run: ${syncFolder.name}\n\n`;
  md += `**Source:** \`${syncFolder.source_folder}\`\n`;
  md += `**Destination:** \`${syncFolder.dest_folder}\`\n`;
  md += `**Delete mode:** ${syncFolder.delete_dest ? "Yes" : "No"}\n\n---\n\n`;

  if (result.added.length === 0 && result.deleted.length === 0 && result.updated.length === 0) {
    md += `**Everything is in sync.** No changes needed.\n`;
    return md;
  }

  if (result.added.length > 0) {
    md += `##### New files (${result.added.length})\n\n`;
    md += result.added.map((f) => `- \`${f}\``).join("\n") + "\n\n";
  }
  if (result.updated.length > 0) {
    md += `##### Updated files (${result.updated.length})\n\n`;
    md += result.updated.map((f) => `- \`${f}\``).join("\n") + "\n\n";
  }
  if (result.deleted.length > 0) {
    md += `##### Deleted files (${result.deleted.length})\n\n`;
    md += result.deleted.map((f) => `- \`${f}\``).join("\n") + "\n\n";
  }

  md += `---\n\n**Total:** ${result.added.length} new, ${result.updated.length} updated, ${result.deleted.length} deleted\n`;
  return md;
}

export function DryRunView({ syncFolder }: { syncFolder: SyncFolders }) {
  const { runSyncFolders } = useSyncFolders();
  const [markdown, setMarkdown] = useState("#### Running dry run...\n\n*Analyzing changes...*");
  const [isLoading, setIsLoading] = useState(true);
  const [aiAdvice, setAiAdvice] = useState("");
  const cachedParsed = useRef<{ added: string[]; deleted: string[]; updated: string[] } | null>(null);

  useEffect(() => {
    (async () => {
      const result = await executeDryRun(syncFolder);
      if (!result.success) {
        setMarkdown(`#### Dry Run Failed\n\n\`\`\`\n${result.error}\n\`\`\``);
        setIsLoading(false);
        return;
      }

      const parsed = parseDryRunOutput(result.output);
      cachedParsed.current = parsed;
      setMarkdown(buildMarkdown(syncFolder, parsed));
      setIsLoading(false);
    })();
  }, [syncFolder]);

  async function getAiAdvice() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Getting AI advice..." });

    try {
      const parsed = cachedParsed.current;
      if (!parsed) {
        toast.style = Toast.Style.Failure;
        toast.title = "Dry run not ready";
        return;
      }

      const total = parsed.added.length + parsed.updated.length + parsed.deleted.length;

      if (total === 0) {
        setAiAdvice("\n\n---\n\n#### AI Advice\n\nFolders are already in sync. No action needed.");
        toast.hide();
        return;
      }

      const prompt = `You are a file synchronization expert. Analyze this rsync dry-run result and provide brief advice.

Source: ${syncFolder.source_folder}
Destination: ${syncFolder.dest_folder}
Delete mode: ${syncFolder.delete_dest ? "ON" : "OFF"}

Changes:
- ${parsed.added.length} new files to copy
- ${parsed.updated.length} files to update
- ${parsed.deleted.length} files to delete

${parsed.deleted.length > 0 ? `Files to delete:\n${parsed.deleted.slice(0, 20).join("\n")}` : ""}

Respond concisely:
1. Is this safe to proceed? (one sentence)
2. Any concerns? (one sentence, or "None")
3. Recommendation (one sentence)`;

      const response = await AI.ask(prompt, { creativity: "low" });
      setAiAdvice("\n\n---\n\n#### AI Advice\n\n" + response);
      toast.hide();
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = "AI advice failed";
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown + aiAdvice}
      actions={
        <ActionPanel>
          <Action
            title="Proceed with Sync"
            icon={Icon.ArrowClockwise}
            onAction={async () => {
              await runSyncFolders(syncFolder);
            }}
          />
          <Action
            title="Get AI Advice"
            icon={Icon.Stars}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={getAiAdvice}
          />
          <Action.CopyToClipboard title="Copy Report" content={markdown + aiAdvice} />
        </ActionPanel>
      }
    />
  );
}
