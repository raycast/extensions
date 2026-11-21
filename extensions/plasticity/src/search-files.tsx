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
const LIMIT = 500;

async function findFiles(): Promise<{ files: PlasticityFile[]; total: number }> {
  const query = EXTENSIONS.map((ext) => `kMDItemFSName == "*.${ext}"c`).join(" || ");
  const { stdout } = await run("/usr/bin/mdfind", ["-0", query], { maxBuffer: 8_000_000, timeout: 15_000 });
  const paths = stdout.split("\0").filter((path) => path && !path.includes("/.Trash/"));
  const files = await Promise.all(
    paths.slice(0, LIMIT).map(async (path) => {
      try {
        const info = await stat(path);

        return { path, name: basename(path), folder: dirname(path), kind: "Plasticity", modified: info.mtime };
      } catch {
        return undefined;
      }
    }),
  );
  return {
    files: files
      .filter((file): file is PlasticityFile => Boolean(file))
      .sort((a, b) => b.modified.getTime() - a.modified.getTime()),
    total: paths.length,
  };
}

export default function SearchFiles() {
  const { data, error, isLoading, revalidate } = usePromise(findFiles);
  const home = homedir();
  const refresh = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      onAction={revalidate}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Plasticity files…">
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
          title="No Plasticity files found"
          description="Spotlight has no .plasticity files indexed."
          actions={<ActionPanel>{refresh}</ActionPanel>}
        />
      )}
      {data && data.total > LIMIT ? (
        <List.Item
          icon={Icon.Info}
          title={`Showing ${LIMIT} of ${data.total} Spotlight matches`}
          subtitle="Other files are not searched here; open them from Finder or Plasticity"
          actions={<ActionPanel>{refresh}</ActionPanel>}
        />
      ) : null}
      {data?.files.map((file) => (
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
              {refresh}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
