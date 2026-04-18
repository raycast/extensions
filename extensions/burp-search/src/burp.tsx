import { List, ActionPanel, Action, showToast, Toast, getPreferenceValues, environment } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec, execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

interface BurpProject {
  name: string;
  path: string;
  modified: Date;
}

interface Cache {
  searchDirectory: string;
  projects: Array<{ name: string; path: string; modified: string }>;
}

interface Preferences {
  searchDirectory: string;
  burpAppName: string;
}

const CACHE_FILE = path.join(environment.supportPath, "projects-cache.json");

function expandPath(p: string): string {
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}

function loadCache(searchDirectory: string): BurpProject[] {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    const cache: Cache = JSON.parse(raw);
    if (cache.searchDirectory !== searchDirectory) return [];
    return cache.projects
      .filter((p) => fs.existsSync(p.path))
      .map((p) => ({ name: p.name, path: p.path, modified: new Date(p.modified) }));
  } catch {
    return [];
  }
}

function saveCache(searchDirectory: string, projects: BurpProject[]) {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    const cache: Cache = {
      searchDirectory,
      projects: projects.map((p) => ({ name: p.name, path: p.path, modified: p.modified.toISOString() })),
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  } catch {
    // non-fatal
  }
}

function runFind(searchDir: string, newerThan?: string): Promise<BurpProject[]> {
  const expanded = expandPath(searchDir);
  const newerFlag = newerThan ? `-newer "${newerThan}"` : "";
  const cmd = `find "${expanded}" -name "*.burp" -type f ${newerFlag} 2>/dev/null`;

  return new Promise((resolve) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (_, stdout) => {
      const results = stdout
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((filePath): BurpProject => {
          const stats = fs.statSync(filePath);
          return { name: path.basename(filePath), path: filePath, modified: stats.mtime };
        });
      resolve(results);
    });
  });
}

function mergeProjects(cached: BurpProject[], fresh: BurpProject[]): BurpProject[] {
  const map = new Map(cached.map((p) => [p.path, p]));
  for (const p of fresh) map.set(p.path, p);
  return Array.from(map.values()).sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

function openWithBurp(projectPath: string, appName: string) {
  try {
    execSync(`open -a "${appName}" "${projectPath}"`);
    showToast({ style: Toast.Style.Success, title: "Opening", message: path.basename(projectPath) });
  } catch {
    showToast({ style: Toast.Style.Failure, title: "Failed to open", message: `Is "${appName}" installed?` });
  }
}

export default function SearchBurpProjects() {
  const { searchDirectory, burpAppName } = getPreferenceValues<Preferences>();
  const homeDir = os.homedir();
  const [projects, setProjects] = useState<BurpProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);

    const cached = loadCache(searchDirectory);
    const hasCache = cached.length > 0;

    if (hasCache) {
      setProjects(cached);
    }

    // If cache exists, only scan for files newer than the cache file.
    // Otherwise do a full scan.
    const newFiles = await runFind(searchDirectory, hasCache ? CACHE_FILE : undefined);
    const merged = hasCache
      ? mergeProjects(cached, newFiles)
      : newFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime());

    setProjects(merged);
    saveCache(searchDirectory, merged);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Burp Suite projects...">
      {projects.map((project) => {
        const displayPath = project.path.startsWith(homeDir) ? "~" + project.path.slice(homeDir.length) : project.path;

        return (
          <List.Item
            key={project.path}
            title={project.name.replace(/\.burp$/, "")}
            subtitle={path.dirname(displayPath)}
            accessories={[{ date: project.modified, tooltip: "Last modified" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Burp Suite"
                  icon="extension-icon.png"
                  onAction={() => openWithBurp(project.path, burpAppName)}
                />
                <Action.ShowInFinder path={project.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={project.path}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
                <Action
                  title="Full Rescan"
                  icon="arrow-clockwise-16"
                  onAction={async () => {
                    try {
                      fs.unlinkSync(CACHE_FILE);
                    } catch {
                      /* ignore */
                    }
                    await load();
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
