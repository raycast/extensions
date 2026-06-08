import { Action, ActionPanel, Detail } from "@raycast/api";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { formatRandomFactEmptyMarkdown, formatRandomFactErrorMarkdown, formatRandomFactMarkdown } from "./formatters";
import { fetchRandomFact } from "./services/fetch-random-fact";
import type { RandomFactSource, RandomFactState } from "./types";

function RandomFactActions({ source, onRefresh }: { onRefresh: () => void; source?: RandomFactSource }) {
  const actions: ReactNode[] = [];

  actions.push(<Action key="refresh" title="Get Another Fact" onAction={onRefresh} />);

  if (source?.homepageUrl) {
    actions.push(<Action.OpenInBrowser key="open-source" title="Open Link" url={source.homepageUrl} />);
  }

  return <ActionPanel>{actions}</ActionPanel>;
}

function RandomFactView({ state, onRefresh }: { onRefresh: () => void; state: RandomFactState }) {
  if (state.kind === "loading") {
    return <Detail isLoading markdown={`# Random Fact\n\nLoading a random fact...`} />;
  }

  if (state.kind === "error") {
    return (
      <Detail
        actions={<RandomFactActions onRefresh={onRefresh} source={state.source} />}
        markdown={formatRandomFactErrorMarkdown(state.source?.name, state.message)}
      />
    );
  }

  if (state.kind === "empty") {
    return (
      <Detail
        actions={<RandomFactActions onRefresh={onRefresh} source={state.source} />}
        markdown={formatRandomFactEmptyMarkdown(state.source)}
      />
    );
  }

  const { event, source } = state;
  const openUrl = event?.itemUrl ?? source.homepageUrl;
  const markdown = formatRandomFactMarkdown(source, event ?? { title: "" });
  // Copy plain fact text instead of the rendered markdown shown in the detail view.
  const copyContent = [
    event?.title,
    event?.year ? `Year: ${event.year}` : undefined,
    event?.description && event?.description !== event?.year ? event?.description : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action title="Get Another Fact" onAction={onRefresh} />
          {openUrl ? <Action.OpenInBrowser title="Open Link" url={openUrl} /> : null}
          <Action.CopyToClipboard content={copyContent} title="Copy Fact" />
        </ActionPanel>
      }
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {event?.year ? <Detail.Metadata.Label title="Year" text={event.year ?? ""} /> : null}
          <Detail.Metadata.Label title="Source" text={source.name} />
          {source.homepageUrl ? (
            <Detail.Metadata.Link target={source.homepageUrl} text={source.homepageUrl} title="Source Link" />
          ) : null}
          {event?.itemUrl ? (
            <Detail.Metadata.Link target={event.itemUrl} text={event.itemUrl} title="Item Link" />
          ) : null}
        </Detail.Metadata>
      }
    />
  );
}

export default function RandomFactCommand() {
  const [refreshCount, setRefreshCount] = useState(0);
  const [state, setState] = useState<RandomFactState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    setState({ kind: "loading" });

    void fetchRandomFact()
      .then((result) => {
        if (cancelled) {
          return;
        }

        setState(result.event ? { kind: "ready", ...result } : { kind: "empty", source: result.source });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setState({ kind: "error", message: error instanceof Error ? error.message : "Unexpected error" });
      });

    return () => {
      cancelled = true;
    };
  }, [refreshCount]);

  return <RandomFactView onRefresh={() => setRefreshCount((count) => count + 1)} state={state} />;
}
