import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";
import fetch from "node-fetch";
import { useState, useEffect } from "react";

const execAsync = promisify(exec);

interface Server {
  port: number;
  url: string;
  pid: number;
  processName: string;
  pageTitle?: string;
}

const IGNORED_PROCESSES = [
  "svchost",
  "System",
  "Idle",
  "smss",
  "csrss",
  "wininit",
  "services",
  "lsass",
  "winlogon",
  "fontdrvhost",
  "Memory Compression",
  "spoolsv",
];

const IGNORED_PORTS = [
  135, // RPC
  139, // NetBIOS
  445, // SMB
  5357, // WSDAPI
];

const getPageTitle = async (url: string): Promise<string | undefined> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000); // 1s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) return undefined;

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : undefined;
  } catch {
    return undefined;
  }
};

const getListeningPorts = async (): Promise<{ servers: Server[]; duration: number }> => {
  const startTime = performance.now();
  const psCommand = `
    $ProgressPreference = 'SilentlyContinue';
    $processes = Get-Process | Group-Object -Property Id -AsHashTable;
    Get-NetTCPConnection -State Listen | 
    Select-Object LocalPort, OwningProcess | 
    Sort-Object -Property LocalPort -Unique | 
    ForEach-Object {
      $p = $processes[[int]$_.OwningProcess]
      [PSCustomObject]@{
        Port = $_.LocalPort
        PID = $_.OwningProcess
        ProcessName = if ($p) { $p.ProcessName } else { "Unknown" }
      }
    } | ConvertTo-Json -Compress
  `;

  try {
    const encodedCommand = Buffer.from(psCommand, "utf16le").toString("base64");
    const { stdout } = await execAsync(`powershell -NoProfile -EncodedCommand "${encodedCommand}"`);

    const endTime = performance.now();
    const duration = endTime - startTime;

    if (!stdout.trim()) return { servers: [], duration };

    const data = JSON.parse(stdout);
    const entries = Array.isArray(data) ? data : [data];

    const servers = entries
      .map((entry: { Port: number; PID: number; ProcessName: string }) => ({
        port: entry.Port,
        url: `http://localhost:${entry.Port}`,
        pid: entry.PID,
        processName: entry.ProcessName,
      }))
      .filter((server: Server) => {
        return (
          !IGNORED_PORTS.includes(server.port) && !IGNORED_PROCESSES.includes(server.processName) && server.port > 0
        );
      });

    return { servers, duration };
  } catch (error) {
    console.error("Failed to fetch ports:", error);
    throw new Error("Failed to fetch running servers. Make sure you are on Windows.");
  }
};

export default function Command() {
  const { isLoading, data } = usePromise(getListeningPorts, [], {
    onError: (error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to scan ports",
        message: error.message,
      });
    },
  });

  const servers = data?.servers;
  const duration = data?.duration;

  const [titles, setTitles] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!isLoading && duration !== undefined) {
      showToast({
        style: Toast.Style.Success,
        title: "Scan completed",
        message: `Took ${duration.toFixed(0)}ms`,
      });
    }
  }, [isLoading, duration]);

  useEffect(() => {
    if (!servers) return;

    let isMounted = true;

    const fetchTitles = async () => {
      await Promise.all(
        servers.map(async (server) => {
          if (titles[server.port]) return;

          const title = await getPageTitle(server.url);
          if (isMounted && title) {
            setTitles((prev) => ({ ...prev, [server.port]: title }));
          }
        }),
      );
    };

    fetchTitles();

    return () => {
      isMounted = false;
    };
  }, [servers]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search running servers..."
      navigationTitle={duration ? `Localhost (${duration.toFixed(0)}ms)` : "Localhost"}
    >
      {servers?.map((server) => (
        <List.Item
          key={server.port}
          icon={{ source: `http://localhost:${server.port}/favicon.ico`, fallback: Icon.Globe }}
          title={titles[server.port] || server.pageTitle || server.processName || "Unknown Server"}
          subtitle={`localhost:${server.port}`}
          accessories={[{ text: server.processName }, { text: `PID: ${server.pid}` }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={server.url} />
              <Action.CopyToClipboard content={server.url} title="Copy URL" />
              <Action.CopyToClipboard content={server.port.toString()} title="Copy Port" />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && servers?.length === 0 && (
        <List.EmptyView
          icon={Icon.Monitor}
          title="No servers found"
          description="Make sure your servers are running."
        />
      )}
    </List>
  );
}
