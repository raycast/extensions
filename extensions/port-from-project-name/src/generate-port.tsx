import { Action, ActionPanel, Detail, LaunchProps } from "@raycast/api";
import crypto from "crypto";
import { useEffect, useMemo, useRef } from "react";
import { useLocalStorage } from "@raycast/utils";

type HistoryEntry = {
  port: number;
  createdAt: string;
  updatedAt: string;
  isEdited?: boolean;
};

function getEditedPorts(history: Record<string, HistoryEntry>, excludeProject: string): Set<number> {
  const editedPorts = new Set<number>();
  for (const [name, entry] of Object.entries(history)) {
    if (name !== excludeProject && entry.isEdited) {
      editedPorts.add(entry.port);
    }
  }
  return editedPorts;
}

function shiftPort(basePort: number, editedPorts: Set<number>): number {
  let port = basePort;
  let attempts = 0;
  const maxAttempts = 9000; // Full range of possible ports

  while (editedPorts.has(port) && attempts < maxAttempts) {
    port = port >= 9999 ? 1000 : port + 1;
    attempts++;
  }

  return port;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.GeneratePort }>) {
  const { projectName } = props.arguments;

  const hash = crypto.createHash("md5").update(projectName).digest("hex");
  const intVal = parseInt(hash.substring(0, 8), 16);
  const basePort = 1000 + (intVal % 9000);

  const {
    value: history,
    setValue: setHistory,
    isLoading: isHistoryLoading,
  } = useLocalStorage<Record<string, HistoryEntry>>("port-history-v1", {});

  // Calculate final port, shifting if it collides with an edited port
  const port = useMemo(() => {
    if (isHistoryLoading || !history) return basePort;
    const editedPorts = getEditedPorts(history, projectName);
    return shiftPort(basePort, editedPorts);
  }, [basePort, history, isHistoryLoading, projectName]);

  const wroteRef = useRef(false);

  useEffect(() => {
    if (isHistoryLoading || wroteRef.current) return;

    const now = new Date().toISOString();
    const currentHistory: Record<string, HistoryEntry> = history ?? {};
    const existing = currentHistory[projectName];
    const createdAt = existing?.createdAt ?? now;

    // Don't overwrite if the user has manually edited this port
    if (existing?.isEdited) return;

    const shouldWrite = !existing || existing.port !== port;
    if (!shouldWrite) return;

    const next: Record<string, HistoryEntry> = {
      ...currentHistory,
      [projectName]: { port, createdAt, updatedAt: now },
    };

    const keys = Object.keys(next);
    if (keys.length > 1000) {
      const toDrop = keys.sort(
        (a, b) => new Date(next[a].updatedAt).getTime() - new Date(next[b].updatedAt).getTime(),
      )[0];
      delete next[toDrop];
    }

    wroteRef.current = true;
    void setHistory(next);
  }, [isHistoryLoading, history, projectName, port, setHistory]);

  const markdown = `# ${port}

Generated from project name: **${projectName}**`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Project Name" text={projectName} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Generated Port" text={port.toString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Port" content={String(port)} />
          <Action.CopyToClipboard title="Copy Project Name" content={projectName} />
          <Action.CopyToClipboard title="Copy Project:Port" content={`${projectName}:${port}`} />
        </ActionPanel>
      }
    />
  );
}
