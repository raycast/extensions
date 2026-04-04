import { Action, ActionPanel, Detail, LaunchProps, showHUD, popToRoot, Icon } from "@raycast/api";
import { execFile, ChildProcess } from "child_process";
import { promisify } from "util";
import { useEffect, useRef, useState } from "react";

const execFileP = promisify(execFile);

const FALLBACK_CLI = "/Applications/Cling.app/Contents/SharedSupport/ClingCLI";

let cachedCLI: string | null = null;

async function resolveClingCLI(): Promise<string> {
  if (cachedCLI) return cachedCLI;
  try {
    const { stdout } = await execFileP("/bin/ps", ["-Axo", "comm="]);
    const line = stdout.split("\n").find((l) => l.includes("/Cling.app/Contents/MacOS/"));
    if (line) {
      const marker = "/Cling.app";
      const end = line.indexOf(marker) + marker.length;
      const bundle = line.slice(0, end);
      cachedCLI = `${bundle}/Contents/SharedSupport/ClingCLI`;
      return cachedCLI;
    }
  } catch {
    // fall through to fallback
  }
  cachedCLI = FALLBACK_CLI;
  return cachedCLI;
}

type ClingScope = {
  name: string;
  rawValue: string;
  count: number;
  enabled: boolean;
  indexed: boolean;
  indexing: boolean;
  operation?: string;
  operationCount?: number;
};

type ClingVolume = {
  name: string;
  path: string;
  count: number;
  enabled: boolean;
  indexed: boolean;
  indexing: boolean;
  operation?: string;
  operationCount?: number;
};

type ClingStatus = {
  indexCount: number;
  operation?: string;
  state: string;
  scopes: ClingScope[];
  volumes: ClingVolume[];
};

const fmt = (n: number) => n.toLocaleString("en-US");

type Entry = {
  name: string;
  count: number;
  enabled: boolean;
  indexed: boolean;
  indexing: boolean;
  operationCount?: number;
};

function renderEntry(e: Entry, extra?: string): string {
  const suffixes: string[] = [];
  if (extra) suffixes.push(extra);
  if (!e.enabled) {
    suffixes.push("*disabled*");
  } else if (e.indexing) {
    const n = e.operationCount;
    suffixes.push(n != null ? `*indexing ${fmt(n)} files*` : "*indexing*");
  } else if (!e.indexed) {
    suffixes.push("*not indexed*");
  }
  const tail = suffixes.length > 0 ? ` (${suffixes.join(", ")})` : "";
  return `- **${e.name}**: ${fmt(e.count)} files${tail}`;
}

function renderStatus(data: ClingStatus): string {
  const lines: string[] = [];

  lines.push(`**State:** \`${data.state}\`  `);
  lines.push(`**Total indexed:** ${fmt(data.indexCount)} files`);
  lines.push("");

  const activeScopes = data.scopes.filter((s) => s.indexing);
  const activeVolumes = data.volumes.filter((v) => v.indexing);
  if (activeScopes.length + activeVolumes.length > 0) {
    lines.push("## In Progress");
    lines.push("");
    for (const s of activeScopes) {
      const n = s.operationCount;
      lines.push(`- **${s.name}**: ${n != null ? `${fmt(n)} files` : "indexing"}`);
    }
    for (const v of activeVolumes) {
      const n = v.operationCount;
      lines.push(`- **${v.name}**: ${n != null ? `${fmt(n)} files` : "indexing"}`);
    }
    lines.push("");
  }

  lines.push("## Scopes");
  lines.push("");
  for (const s of data.scopes) {
    lines.push(renderEntry(s));
  }

  if (data.volumes.length > 0) {
    lines.push("");
    lines.push("## Volumes");
    lines.push("");
    for (const v of data.volumes) {
      lines.push(renderEntry(v, `\`${v.path}\``));
    }
  }

  return lines.join("\n");
}

export default function Command(props: LaunchProps<{ arguments: Arguments.ReindexFiles }>) {
  const scope = props.arguments.scope?.trim() || "";
  const isAll = !scope;
  const label = isAll ? "all scopes" : scope;

  const [body, setBody] = useState("_Starting reindex..._");
  const [header, setHeader] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const reindexProc = useRef<ChildProcess | null>(null);
  const pollTimer = useRef<NodeJS.Timeout | null>(null);
  const cancelled = useRef(false);
  const finishedRef = useRef(false);
  const cliPath = useRef<string>(FALLBACK_CLI);

  const stopPolling = () => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const pollStatus = () => {
    execFile(cliPath.current, ["status", "--json"], (error, stdout, stderr) => {
      if (finishedRef.current) return;
      if (error) {
        setBody(`Failed to get status:\n\n\`\`\`\n${stderr || error.message}\n\`\`\``);
        return;
      }
      try {
        const data = JSON.parse(stdout) as ClingStatus;
        setBody(renderStatus(data));
      } catch {
        setBody(`Failed to parse status:\n\n\`\`\`\n${stdout}\n\`\`\``);
      }
    });
  };

  useEffect(() => {
    let cancelledEffect = false;

    (async () => {
      cliPath.current = await resolveClingCLI();
      if (cancelledEffect) return;

      const args = ["reindex", "--wait"];
      if (!isAll) {
        args.push("--scope", scope);
      }

      const child = execFile(cliPath.current, args, (error) => {
        stopPolling();
        finishedRef.current = true;
        setFinished(true);
        if (cancelled.current) {
          setHeader(`### Reindex cancelled (${label})`);
        } else if (error) {
          setHeader(`### Reindex failed (${label})\n\n\`\`\`\n${error.message}\n\`\`\``);
        } else {
          setHeader(`### Reindex complete (${label})`);
        }
      });
      reindexProc.current = child;

      pollStatus();
      pollTimer.current = setInterval(pollStatus, 2000);
    })();

    return () => {
      cancelledEffect = true;
      stopPolling();
    };
  }, []);

  const cancelReindex = async () => {
    if (finished || !reindexProc.current) return;
    cancelled.current = true;
    const cancelArgs = ["reindex", "--cancel"];
    if (!isAll) {
      cancelArgs.push("--scope", scope);
    }
    execFile(cliPath.current, cancelArgs, (error) => {
      if (error) {
        showHUD(`Cling: Failed to cancel reindex (${label})`);
      }
    });
    await showHUD(`Cling: Cancelling reindex (${label})...`);
    await popToRoot();
  };

  const footer = finished
    ? ""
    : "\n\n---\n\n_Press `Esc` to close this view. Indexing will continue in the background._";
  const markdown = `# Reindexing ${label}\n\n${header ? header + "\n\n" : ""}${body}${footer}`;

  return (
    <Detail
      markdown={markdown}
      isLoading={!finished}
      actions={
        <ActionPanel>
          {!finished && (
            <Action
              title="Cancel Indexing"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onAction={cancelReindex}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
