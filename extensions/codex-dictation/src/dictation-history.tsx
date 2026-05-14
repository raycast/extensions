import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { DictationListItem } from "./components/dictation-list-item";
import {
  CodexMissingItem,
  EmptyHistoryItem,
  ErrorItem,
  SkippedLinesItem,
} from "./components/status-items";
import { loadDictationHistory } from "./history";
import type { LoadState } from "./types";

export default function Command() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    setState(loadDictationHistory());
  }, []);

  const entries = state.status === "loaded" ? state.entries : [];

  return (
    <List
      isShowingDetail
      isLoading={state.status === "loading"}
      searchBarPlaceholder="Search dictations..."
    >
      {state.status === "codex-missing" ? (
        <CodexMissingItem paths={state.paths} />
      ) : null}
      {state.status === "error" ? (
        <ErrorItem message={state.message} paths={state.paths} />
      ) : null}
      {state.status === "history-missing" ? (
        <EmptyHistoryItem paths={state.paths} />
      ) : null}
      {state.status === "loaded" && entries.length === 0 ? (
        <EmptyHistoryItem paths={state.paths} />
      ) : null}
      {state.status === "loaded" && state.skippedLines > 0 ? (
        <SkippedLinesItem skippedLines={state.skippedLines} />
      ) : null}
      {entries.map((entry) => (
        <DictationListItem key={entry.id} entry={entry} />
      ))}
    </List>
  );
}
