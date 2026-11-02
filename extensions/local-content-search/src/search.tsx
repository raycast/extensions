import {
  Action,
  ActionPanel,
  Icon,
  List,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { basename, dirname } from "node:path";
import { LocalClient } from "../service/client";
import { Hit } from "../service/protocol";
import { location } from "./location";
import { InstallationGate } from "./installation";
import { showFailureToast } from "@raycast/utils";

// Debounce and abort stale requests; typing never launches overlapping model workers.
const DEBOUNCE_MS = 300;
const client = new LocalClient();

function actions(hit?: Hit) {
  return (
    <ActionPanel>
      {hit && (
        <ActionPanel.Section>
          <Action.Open title="Open File" target={hit.path} />
          <Action.ShowInFinder path={hit.path} />
          <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
          <Action.CopyToClipboard
            title="Copy File Path"
            content={hit.path}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {hit.excerpt && (
            <Action.CopyToClipboard
              title="Copy Matched Text"
              content={hit.excerpt}
            />
          )}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        <Action
          title="Manage Content Index"
          icon={Icon.Gear}
          onAction={async () => {
            try {
              await launchCommand({
                name: "manage",
                type: LaunchType.UserInitiated,
              });
            } catch (failure) {
              await showFailureToast(failure, {
                title: "Could not open index controls",
              });
            }
          }}
        />
        <Action
          title="Set Up Local Search"
          icon={Icon.Download}
          onAction={async () => {
            try {
              await launchCommand({
                name: "setup",
                type: LaunchType.UserInitiated,
              });
            } catch (failure) {
              await showFailureToast(failure, {
                title: "Could not open setup",
              });
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

// Do not mount query effects until the independently installed service is healthy.
export default function Search() {
  return (
    <InstallationGate>
      <SearchView />
    </InstallationGate>
  );
}

function SearchView() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      setError(undefined);
      setLoading(false);
      return;
    }
    const abort = new AbortController();
    setLoading(true);
    setError(undefined);
    setHits([]);
    const timer = setTimeout(() => {
      void client
        .search(query, abort.signal)
        .then((rows) => {
          if (!abort.signal.aborted) {
            setHits(rows);
          }
        })
        .catch((failure) => {
          if (!abort.signal.aborted) {
            setError(failure.message);
          }
        })
        .finally(() => {
          if (!abort.signal.aborted) {
            setLoading(false);
          }
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [query]);

  // Use Raycast's keyboard-accessible list and Quick Look rather than custom window controls.
  return (
    <List
      isLoading={loading}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Describe a document, photo, or recording…"
      isShowingDetail={hits.length > 0}
    >
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : Icon.MagnifyingGlass}
        title={
          error
            ? "Search unavailable"
            : query
              ? "No matching content"
              : "Search your files by content"
        }
        description={
          error ??
          (query
            ? "Try a shorter description or check indexing status."
            : "EmbeddingGemma 2 runs locally. Only selected folders are indexed.")
        }
        actions={actions()}
      />
      {hits.map((hit, index) => (
        <List.Item
          key={`${hit.path}:${hit.segment}:${hit.loc}:${index}`}
          title={basename(hit.path)}
          subtitle={location(hit)}
          icon={{ fileIcon: hit.path }}
          quickLook={{ path: hit.path }}
          actions={actions(hit)}
          detail={
            <List.Item.Detail
              markdown={
                hit.excerpt
                  ? hit.excerpt.replace(/[\\`*_{}\[\]<>#]/g, "\\$&")
                  : "Content matched by the local embedding model. Use Quick Look to inspect the file."
              }
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Folder"
                    text={dirname(hit.path)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Match"
                    text={location(hit)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Type"
                    text={hit.kind}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Privacy"
                    text="Local only"
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
