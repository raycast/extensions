import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { homedir } from "node:os";
import { promisify } from "node:util";

const run = promisify(execFile);
const EXTENSIONS = ["plasticity"];

type PlasticityFile = { path: string; name: string; folder: string; kind: string; modified: Date };

// Spotlight query by file extension. No shell is involved.
async function findFiles(): Promise<PlasticityFile[]> {
  const query = EXTENSIONS.map((ext) => `kMDItemFSName == "*.${ext}"c`).join(" || ");
  const { stdout } = await run("/usr/bin/mdfind", [query], { maxBuffer: 8_000_000, timeout: 15_000 });
  const files = await Promise.all(
    stdout
      .split("\n")
      .filter((line) => line && !line.includes("/.Trash/"))
      .slice(0, 500)
      .map(async (path) => {
        try {
          const info = await stat(path);

          return { path, name: basename(path), folder: dirname(path), kind: "Plasticity", modified: info.mtime };
        } catch {
          return undefined;
        }
      }),
  );
  return files
    .filter((file): file is PlasticityFile => Boolean(file))
    .sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

export default function SearchFiles() {
  const { data = [], isLoading, revalidate } = usePromise(findFiles);
  const home = homedir();
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Plasticity files…">
      <List.EmptyView
        icon={Icon.Document}
        title="No Plasticity files found"
        description="Spotlight has no .plasticity files indexed."
      />
      {data.map((file) => (
        <List.Item
          key={file.path}
          title={file.name.replace(/\.[^.]+$/, "")}
          subtitle={file.folder.replace(home, "~")}
          icon={{ fileIcon: file.path }}

          accessories={[{ date: file.modified, tooltip: `Modified ${file.modified.toLocaleString()}` }]}
          quickLook={{ path: file.path, name: file.name }}
          actions={
            <ActionPanel>
              <Action.Open title="Open in Plasticity" target={file.path} icon={Icon.Document} />
              <Action.ShowInFinder path={file.path} />
              <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
              <Action.CopyToClipboard
                title="Copy File Path"
                content={file.path}
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
