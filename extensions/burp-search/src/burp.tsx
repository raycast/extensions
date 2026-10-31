import { List, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { promises as fs, Dirent } from "fs";
import * as path from "path";
import * as os from "os";

interface BurpProject {
  name: string;
  path: string;
  modified: number; // mtime in ms; Burp writes to the project file while it's open, so this tracks last use
}

interface Preferences {
  searchDirectory: string;
  burpAppName: string;
}

// Directories that never contain Burp projects but can be huge to walk
const SKIP_DIR_NAMES = new Set(["node_modules"]);
const SKIP_PATHS = new Set([path.join(os.homedir(), "Library")]);

function expandPath(p: string): string {
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}

async function findBurpProjects(dir: string): Promise<BurpProject[]> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return []; // unreadable directory
  }

  const results = await Promise.all(
    entries.map(async (entry): Promise<BurpProject[]> => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || SKIP_DIR_NAMES.has(entry.name) || SKIP_PATHS.has(fullPath)) return [];
        return findBurpProjects(fullPath);
      }
      if (entry.isFile() && entry.name.endsWith(".burp")) {
        try {
          const stats = await fs.stat(fullPath);
          return [{ name: entry.name, path: fullPath, modified: stats.mtimeMs }];
        } catch {
          return []; // removed mid-scan
        }
      }
      return [];
    }),
  );
  return results.flat();
}

async function loadProjects(searchDirectory: string): Promise<BurpProject[]> {
  const projects = await findBurpProjects(expandPath(searchDirectory));
  return projects.sort((a, b) => b.modified - a.modified);
}

export default function SearchBurpProjects() {
  const { searchDirectory, burpAppName } = getPreferenceValues<Preferences>();
  const homeDir = os.homedir();

  // Shows the last scan instantly, then rescans the whole tree in the background
  const { data: projects = [], isLoading, revalidate } = useCachedPromise(loadProjects, [searchDirectory]);

  const rescanAction = (
    <Action
      title="Rescan"
      icon={Icon.ArrowClockwise}
      onAction={revalidate}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Burp Suite projects...">
      <List.EmptyView
        title={isLoading ? "Scanning..." : "No Burp projects found"}
        description={`Searched ${searchDirectory}`}
        actions={<ActionPanel>{rescanAction}</ActionPanel>}
      />
      {projects.map((project) => {
        const displayPath = project.path.startsWith(homeDir) ? "~" + project.path.slice(homeDir.length) : project.path;

        return (
          <List.Item
            key={project.path}
            title={project.name.replace(/\.burp$/, "")}
            subtitle={path.dirname(displayPath)}
            keywords={displayPath.split(path.sep).filter(Boolean)}
            accessories={[{ date: new Date(project.modified), tooltip: "Last modified" }]}
            actions={
              <ActionPanel>
                <Action.Open
                  title="Open in Burp Suite"
                  icon="extension-icon.png"
                  target={project.path}
                  application={burpAppName}
                />
                <Action.ShowInFinder path={project.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={project.path}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
                {rescanAction}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
