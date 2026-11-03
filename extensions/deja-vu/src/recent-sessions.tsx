import { Action, ActionPanel, getPreferenceValues, List, openExtensionPreferences } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { DejaSessionHit, parseLastJSON, runDeja } from "./lib/deja";
import { locateDeja } from "./lib/locate";
import { SessionActions } from "./search-sessions";

export default function RecentSessionsCommand() {
  const prefs = getPreferenceValues<{ dejaPath?: string }>();
  const bin = locateDeja(prefs.dejaPath);
  const [hits, setHits] = useState<DejaSessionHit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bin) {
      setLoading(false);
      return;
    }
    runDeja(bin, ["last", "100", "--json"])
      .then((out) => setHits(parseLastJSON(out)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bin]);

  if (!bin) {
    return (
      <List>
        <List.EmptyView
          title="deja binary not found"
          description="Install deja-vu with Homebrew (brew install deja-vu) or set its path in Extension Preferences."
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Homebrew Install Command"
                content="brew install deja-vu && deja install --auto"
              />
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={loading} isShowingDetail searchBarPlaceholder="Filter recent sessions…">
      {hits.map((hit) => (
        <List.Item
          key={`${hit.harness}:${hit.id}`}
          title={hit.title || hit.snippet || hit.id}
          subtitle={hit.project}
          accessories={[{ tag: hit.harness }]}
          detail={
            <List.Item.Detail
              markdown={`### ${hit.title || hit.id}\n\n${hit.snippet || ""}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Agent" text={hit.harness} />
                  <List.Item.Detail.Metadata.Label title="Project" text={hit.project} />
                  <List.Item.Detail.Metadata.Label title="Started" text={hit.started || "—"} />
                  <List.Item.Detail.Metadata.Label title="Updated" text={hit.updated || "—"} />
                  <List.Item.Detail.Metadata.Label title="Session ID" text={hit.id} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={<SessionActions bin={bin} hit={hit} />}
        />
      ))}
    </List>
  );
}
