import { Action, ActionPanel, Detail, LaunchProps } from "@raycast/api";
import crypto from "crypto";
import { useEffect, useRef } from "react";
import { useLocalStorage } from "@raycast/utils";

export default function Command(props: LaunchProps<{ arguments: Arguments.GeneratePort }>) {
  const { projectName } = props.arguments;

  const hash = crypto.createHash("md5").update(projectName).digest("hex");
  const intVal = parseInt(hash.substring(0, 8), 16);
  const port = 1000 + (intVal % 9000);

  type HistoryEntry = {
    port: number;
    createdAt: string;
    updatedAt: string;
  };

  const {
    value: history,
    setValue: setHistory,
    isLoading: isHistoryLoading,
  } = useLocalStorage<Record<string, HistoryEntry>>("port-history-v1", {});

  const wroteRef = useRef(false);

  useEffect(() => {
    if (isHistoryLoading || wroteRef.current) return;

    const now = new Date().toISOString();
    const currentHistory: Record<string, HistoryEntry> = history ?? {};
    const existing = currentHistory[projectName];
    const createdAt = existing?.createdAt ?? now;

    const shouldWrite = !existing || existing.port !== port || existing.updatedAt !== now;
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
