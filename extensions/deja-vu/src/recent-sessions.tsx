import { Action, ActionPanel, getPreferenceValues, Icon, List, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import React from "react";
import { parseLastJSON, runDeja } from "./lib/deja";
import { locateDeja } from "./lib/locate";
import { SessionActions } from "./search-sessions";

export default function RecentSessionsCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const bin = locateDeja(prefs.dejaPath);

  const {
    data: hits = [],
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async (binPath: string) => {
      const out = await runDeja(binPath, ["last", "100", "--json"]);
      return parseLastJSON(out);
    },
    [bin ?? ""],
    { execute: Boolean(bin) },
  );

  if (!bin) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="deja binary not found"
          description="Install deja-vu with `brew install deja-vu && deja install --auto` or set its path in Extension Preferences."
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Homebrew Install Command"
                content="brew install deja-vu && deja install --auto"
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Filter recent sessions across all coding agents…">
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load recent sessions"
          description={String(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : null}
      {hits.map((h) => (
        <List.Item
          key={`${h.harness}:${h.id}`}
          title={h.title || h.snippet || h.id}
          detail={
            <List.Item.Detail
              markdown={`### ${h.title || h.id}\n\n${h.snippet ? `> ${h.snippet}\n` : ""}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Agent" text={h.harness || "unknown"} />
                  <List.Item.Detail.Metadata.Label title="Project" text={h.project || "—"} />
                  <List.Item.Detail.Metadata.Label title="Started" text={h.started || "—"} />
                  <List.Item.Detail.Metadata.Label title="Updated" text={h.updated || "—"} />
                  <List.Item.Detail.Metadata.Label title="Session ID" text={h.id} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={<SessionActions bin={bin} hit={h} />}
        />
      ))}
    </List>
  );
}
