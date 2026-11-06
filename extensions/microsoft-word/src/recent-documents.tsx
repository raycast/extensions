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

// Spotlight query for Word documents, newest use first. No shell is involved.
async function recentDocuments(days: number): Promise<RecentDoc[]> {
  const query = `(kMDItemContentTypeTree == "org.openxmlformats.wordprocessingml.document" || kMDItemContentTypeTree == "com.microsoft.word.doc") && kMDItemLastUsedDate >= $time.today(-${days})`;
  const { stdout } = await run("/usr/bin/mdfind", [query], { maxBuffer: 4_000_000, timeout: 15_000 });
  const paths = stdout.split("\n").filter((line) => line && !basename(line).startsWith("~$"));
  const docs = await Promise.all(
    paths.slice(0, 400).map(async (path) => {
      try {
        const info = await stat(path);
        return {
          path,
          name: basename(path),
          folder: dirname(path),
          used: info.atime > info.mtime ? info.atime : info.mtime,
        };
      } catch {
        return undefined;
      }
    }),
  );
  return docs.filter((doc): doc is RecentDoc => Boolean(doc)).sort((a, b) => b.used.getTime() - a.used.getTime());
}

export default function RecentDocuments() {
  const { data = [], isLoading, revalidate } = usePromise(recentDocuments, [90]);
  const home = homedir();
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recent Word documents…">
      <List.EmptyView
        icon={Icon.Document}
        title="No recent Word documents"
        description="Documents used in the last 90 days appear here."
      />
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
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
