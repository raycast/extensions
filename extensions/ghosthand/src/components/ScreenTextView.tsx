import { Action, ActionPanel, Icon, List, Keyboard, showToast, Toast } from "@raycast/api";
import { useCallback } from "react";
import { useResource } from "../hooks/use-resource";
import { client } from "../lib/ghosthand-client";
import { withLease } from "../lib/leases";
import type { Phone } from "../lib/types";
import { ErrorView } from "./Setup";
import { TaskForm } from "./TaskForm";

export function ScreenTextView({ phone }: { phone: Phone }) {
  const load = useCallback(
    (signal: AbortSignal) =>
      withLease(client, phone, "Read visible screen text", signal, (lease) => {
        if (lease.notice) {
          void showToast({
            style: Toast.Style.Success,
            title: "Ghosthand Account Notice",
            message: lease.notice,
          }).catch(() => undefined);
        }
        return client.text(lease.id, signal);
      }),
    [phone],
  );
  const { data, error, isLoading, refresh } = useResource(load);
  if (error) return <ErrorView error={error} retry={refresh} />;
  const text = data?.lines.map((line) => line.text).join("\n") ?? "";
  const actions = (selected?: string) => (
    <ActionPanel>
      {text && <Action.CopyToClipboard title="Copy All Text" content={text} icon={Icon.Clipboard} />}
      {selected && <Action.CopyToClipboard title="Copy Selected Text" content={selected} icon={Icon.Clipboard} />}
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={refresh}
        shortcut={selected && text ? Keyboard.Shortcut.Common.Refresh : undefined}
      />
      {text && (
        <Action.Push
          title="Run Task Using Screen Context"
          icon={Icon.Play}
          target={
            <TaskForm
              phoneId={phone.id}
              navigationTitle="Run iPhone Task"
              initialPrompt={`Use this screen text as context for my instruction below:\n\n${text}\n\nMy instruction: `}
            />
          }
        />
      )}
    </ActionPanel>
  );
  return (
    <List
      navigationTitle={`Screen Text · ${phone.name}`}
      isLoading={isLoading}
      searchBarPlaceholder="Visible text · Local OCR"
      filtering={false}
      actions={actions()}
    >
      <List.EmptyView
        title={isLoading ? "Reading the screen…" : "No Text Recognized"}
        description="Refresh after opening a screen with visible text. OCR can miss small or changing text."
        icon={Icon.Text}
        actions={actions()}
      />
      <List.Section title="Visible Text" subtitle="Reading order · Local OCR">
        {data?.lines.map((line, index) => (
          <List.Item
            key={`${index}-${line.x}-${line.y}`}
            title={line.text}
            icon={Icon.Text}
            actions={actions(line.text)}
          />
        ))}
      </List.Section>
    </List>
  );
}
