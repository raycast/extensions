import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { homedir } from "node:os";
import { promisify } from "node:util";

const run = promisify(execFile);
const WORD = "com.microsoft.Word";

type RecentDoc = { path: string; name: string; folder: string; used: Date };

// mdfind -attr prints "<path>   kMDItemLastUsedDate = 2026-01-02 03:04:05 +0000".
export function parseEntry(line: string): { path: string; used: Date } | undefined {
  const match = /^(.*?) {3}kMDItemLastUsedDate = (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/.exec(
    line,
  );
  if (!match) return undefined;
  const used = new Date(`${match[2]}T${match[3]}${match[4]}:${match[5]}`);
  return Number.isNaN(used.getTime()) ? undefined : { path: match[1], used };
}

// Spotlight query for Word documents, newest use first. No shell is involved.
async function recentDocuments(days: number): Promise<RecentDoc[]> {
  const query = `(kMDItemContentTypeTree == "org.openxmlformats.wordprocessingml.document" || kMDItemContentTypeTree == "com.microsoft.word.doc") && kMDItemLastUsedDate >= $time.today(-${days})`;
  const { stdout } = await run("/usr/bin/mdfind", ["-0", "-attr", "kMDItemLastUsedDate", query], {
    maxBuffer: 4_000_000,
    timeout: 15_000,
  });
  const entries = stdout
    .split("\0")
    .map(parseEntry)
    .filter(
      (entry): entry is { path: string; used: Date } => Boolean(entry) && !basename(entry!.path).startsWith("~$"),
    );
  const docs = await Promise.all(
    entries.slice(0, 400).map(async ({ path, used }) => {
      try {
        await stat(path);
        return { path, name: basename(path), folder: dirname(path), used };
      } catch {
        return undefined;
      }
    }),
  );
  return docs.filter((doc): doc is RecentDoc => Boolean(doc)).sort((a, b) => b.used.getTime() - a.used.getTime());
}

export default function RecentDocuments() {
  const { data = [], error, isLoading, revalidate } = usePromise(recentDocuments, [90]);
  const refresh = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      onAction={revalidate}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );
  const home = homedir();
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recent Word documents…">
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't search Spotlight"
          description={error.message}
          actions={<ActionPanel>{refresh}</ActionPanel>}
        />
      ) : (
        <List.EmptyView
          icon={Icon.Document}
          title="No recent Word documents"
          description="Documents used in the last 90 days appear here."
          actions={<ActionPanel>{refresh}</ActionPanel>}
        />
      )}
      {data.map((doc) => (
        <List.Item
          key={doc.path}
          title={doc.name.replace(/\.docx?$/i, "")}
          subtitle={doc.folder.replace(home, "~")}
          icon={{ fileIcon: doc.path }}
          accessories={[{ date: doc.used, tooltip: `Last used ${doc.used.toLocaleString()}` }]}
          quickLook={{ path: doc.path, name: doc.name }}
          actions={
            <ActionPanel>
              <Action.Open title="Open in Word" target={doc.path} application={WORD} icon={Icon.Document} />
              <Action.ShowInFinder path={doc.path} />
              <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
              <Action.CopyToClipboard
                title="Copy File Path"
                content={doc.path}
                shortcut={Keyboard.Shortcut.Common.CopyPath}
              />
              {refresh}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
