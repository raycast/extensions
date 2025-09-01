import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";
import { readFileSync } from "fs";
import { join, dirname } from "path";

type LocalhostItem = {
  id: string;
  name: string;
  port: string;
  pid: string;
  url: string;
  favicon?: string;
};

const LSOF_SCRIPT = `/usr/sbin/lsof -nP -iTCP -sTCP:LISTEN | awk '
  /node.*TCP.*LISTEN/ {
    pid = $2;
    port = "";
    for(i=1; i<=NF; i++) {
      if (match($i, /:([0-9]+)$/)) {
        port = substr($i, RSTART+1, RLENGTH-1);
        break;
      }
    }
    if (port != "") {
      print pid ":" port;
    }
  }'`;

const FALLBACK_SCRIPT = `/usr/sbin/lsof -nP -iTCP -sTCP:LISTEN | grep node | awk '{
  pid = $2;
  addr = $9;
  if (match(addr, /:([0-9]+)$/)) {
    port = substr(addr, RSTART+1, RLENGTH-1);
    print pid ":" port;
  }
}'`;

async function enhanceProcessInfo(output: string): Promise<LocalhostItem[]> {
  const lines = output.split("\n").filter(Boolean);
  const items: LocalhostItem[] = [];

  for (const line of lines) {
    const [pid, port] = line.split(":");
    if (!pid || !port) continue;

    try {
      // Get the command for this process
      const cmdResult = await new Promise<string>((resolve, reject) => {
        exec(`ps -p ${pid} -o command=`, (err, stdout) => {
          if (err) reject(err);
          else resolve(stdout.trim());
        });
      });

      // Skip non-Node.js processes
      if (!cmdResult.includes("node")) {
        continue;
      }

      // Get project information
      const projectPath = await getProjectPath(pid, cmdResult);
      const framework = detectFramework(cmdResult);

      // Try to get the page title from the website
      const url = `http://localhost:${port}`;
      const pageTitle = await getPageTitle(url);

      // Use page title if available, otherwise fall back to file system
      let projectName: string;
      if (pageTitle) {
        projectName = pageTitle;
      } else {
        projectName = getProjectName(projectPath);
      }

      const displayName = createDisplayName(projectName, framework);

      // Try to get favicon
      const favicon = await getFavicon(url);

      items.push({
        id: pid,
        name: displayName,
        port,
        pid,
        url,
        favicon,
      });
    } catch (error) {
      console.error(`Error processing PID ${pid}:`, error);
      // Fallback to basic info
      items.push({
        id: pid,
        name: `Node.js (port ${port})`,
        port,
        pid,
        url: `http://localhost:${port}`,
      });
    }
  }

  return items;
}

async function getPageTitle(url: string): Promise<string | undefined> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return undefined;

    const html = await response.text();

    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
    }

    return undefined;
  } catch {
    return undefined;
  }
}

async function getFavicon(url: string): Promise<string | undefined> {
  try {
    // Try common favicon paths
    const faviconPaths = [
      "/favicon.ico",
      "/favicon.png",
      "/favicon.svg",
      "/apple-touch-icon.png",
      "/android-chrome-192x192.png",
    ];

    for (const path of faviconPaths) {
      try {
        const faviconUrl = `${url}${path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(faviconUrl, {
          method: "HEAD",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return faviconUrl;
        }
      } catch {
        continue;
      }
    }

    // Try to parse HTML for favicon link
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) return undefined;

      const html = await response.text();

      // Look for various favicon link tags
      const faviconRegex = /<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/i;
      const match = html.match(faviconRegex);

      if (match && match[1]) {
        const faviconPath = match[1];

        // Convert relative URLs to absolute
        if (faviconPath.startsWith("/")) {
          return `${url}${faviconPath}`;
        } else if (faviconPath.startsWith("http")) {
          return faviconPath;
        } else {
          return `${url}/${faviconPath}`;
        }
      }
    } catch {
      // HTML parsing failed, ignore
    }

    return undefined;
  } catch {
    return undefined;
  }
}

async function getWorkingDirectory(pid: string): Promise<string | null> {
  const methods = [`lsof -p ${pid} | awk '$4=="cwd" {print $9}' | head -1`, `pwdx ${pid} | cut -d: -f2 | xargs`];

  for (const method of methods) {
    try {
      const result = await new Promise<string>((resolve, reject) => {
        exec(method, (err, stdout) => {
          if (err) reject(err);
          else resolve(stdout.trim());
        });
      });

      if (result && result !== "" && result.startsWith("/")) {
        return result;
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function getProjectPath(pid: string, cmdResult: string): Promise<string> {
  // Try to get working directory first
  const workingDir = await getWorkingDirectory(pid);
  if (workingDir) {
    return workingDir;
  }

  // Fallback: extract project path from command line
  const fullPath = cmdResult.match(/node\s+([^\s]+)/)?.[1];
  if (fullPath) {
    const pathParts = fullPath.split("/");
    const nodeModulesIndex = pathParts.findIndex((part) => part === "node_modules");
    if (nodeModulesIndex > 0) {
      return pathParts.slice(0, nodeModulesIndex).join("/");
    }
  }

  return "";
}

function detectFramework(cmdResult: string): string {
  const frameworks = [
    { pattern: "vite", name: "Vite" },
    { pattern: "webpack", name: "Webpack Dev Server" },
    { pattern: "next", name: "Next.js" },
    { pattern: "nuxt", name: "Nuxt.js" },
    { pattern: "react-scripts", name: "Create React App" },
    { pattern: "vue-cli-service", name: "Vue CLI" },
    { pattern: "angular", name: "Angular" },
    { pattern: "gatsby", name: "Gatsby" },
    { pattern: "nodemon", name: "Nodemon" },
    { pattern: "express", name: "Express" },
  ];

  for (const framework of frameworks) {
    if (cmdResult.includes(framework.pattern)) {
      return framework.name;
    }
  }

  return "";
}

function getProjectName(projectPath: string): string {
  if (!projectPath) return "Node.js";

  const pathsToTry = [projectPath, dirname(projectPath)];

  for (const tryPath of pathsToTry) {
    try {
      const packageJsonPath = join(tryPath, "package.json");
      const packageContent = readFileSync(packageJsonPath, "utf-8");
      const packageData = JSON.parse(packageContent);

      if (packageData.name) {
        return packageData.name;
      }
    } catch {
      continue;
    }
  }

  // Fallback to directory name
  const dirName = projectPath.split("/").pop();
  return dirName && dirName !== "" && dirName !== "." ? dirName : "Node.js";
}

function createDisplayName(projectName: string, framework: string): string {
  if (!framework || framework === projectName) {
    return projectName;
  }

  if (projectName === "Node.js") {
    return framework;
  }

  if (projectName.toLowerCase().includes(framework.toLowerCase())) {
    return projectName;
  }

  return `${projectName} (${framework})`;
}

export default function Command() {
  const [items, setItems] = useState<LocalhostItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function findLocalhostProcesses() {
      setLoading(true);

      try {
        const processes = await new Promise<string>((resolve, reject) => {
          exec(LSOF_SCRIPT, { shell: "/bin/zsh" }, async (err, stdout) => {
            if (err || !stdout?.trim()) {
              // Try fallback script
              exec(FALLBACK_SCRIPT, { shell: "/bin/zsh" }, (err2, stdout2) => {
                if (err2 || !stdout2?.trim()) {
                  reject(new Error("No localhost processes found"));
                } else {
                  resolve(stdout2);
                }
              });
            } else {
              resolve(stdout);
            }
          });
        });

        const enhancedItems = await enhanceProcessInfo(processes);
        setItems(enhancedItems);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: error instanceof Error ? error.message : "Failed to get localhost processes",
        });
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    findLocalhostProcesses();
  }, []);

  return (
    <List isLoading={loading} searchBarPlaceholder="Search local servers...">
      {items.length === 0 && !loading ? (
        <List.EmptyView title="No local Node.js servers found" />
      ) : (
        items.map((item: LocalhostItem) => (
          <List.Item
            key={item.id}
            icon={item.favicon ? { source: item.favicon } : Icon.Globe}
            title={item.name}
            subtitle={item.url}
            accessories={[{ text: `Port: ${item.port}` }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
                <Action.CopyToClipboard content={item.url} title="Copy URL" />
                <Action.CopyToClipboard content={item.pid} title="Copy Pid" />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
