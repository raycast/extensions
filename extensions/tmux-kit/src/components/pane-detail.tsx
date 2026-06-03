import { Action, ActionPanel, Alert, Detail, Icon, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { TmuxError, capturePane, killPane } from "../lib/tmux";
import { codeBlock, toastError } from "../lib/ui";

export function PaneDetail({
  paneId,
  command,
  onChange,
}: {
  paneId: string;
  command: string;
  onChange: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const text = await capturePane(paneId);
      setContent(text);
      setError(null);
    } catch (e) {
      setError(e instanceof TmuxError ? e.stderr || e.message : String(e));
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, [paneId]);

  useEffect(() => {
    void load();
  }, [load]);

  const markdown = error ? `## Failed to capture pane\n\n${codeBlock(error)}` : codeBlock(content ?? "");

  return (
    <Detail
      isLoading={loading}
      navigationTitle={`Pane ${paneId} · ${command || "(no command)"}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          {content != null && !error && <Action.CopyToClipboard title="Copy Content" content={content} />}
          <Action
            title="Reload Capture"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={load}
          />
          <Action
            title="Kill Pane"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={async () => {
              const ok = await confirmAlert({
                title: `Kill pane ${paneId}?`,
                message: `Running: ${command || "(none)"}`,
                primaryAction: {
                  title: "Kill",
                  style: Alert.ActionStyle.Destructive,
                },
              });
              if (!ok) return;
              try {
                await killPane(paneId);
                await showToast({
                  style: Toast.Style.Success,
                  title: `Killed ${paneId}`,
                });
                await onChange();
                pop();
              } catch (e) {
                await toastError("Kill failed", e);
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}
