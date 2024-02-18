import { Icon, List, showToast, Toast, getPreferenceValues } from "@raycast/api";

import { useEffect, useState } from "react";
import type { Snippet, State } from "./types";
import SnippetContent from "./components/SnippetContent";
import CustomActionPanel from "./components/CustomActionPanel";
import { storeLastCopied, getLastCopiedMap, clearUnusedSnippets, orderSnippets } from "./utils/LocalStorageHelper";
import { loadAllSnippets } from "./utils/SnippetsLoader";

export default function Command() {
  const [state, setState] = useState<State>({ snippets: [], isLoading: true });

  const handleAction = async function (snippet: Snippet) {
    await storeLastCopied(snippet);

    const orderMap = await getLastCopiedMap();
    const orderedSnippets = orderSnippets(state.snippets ?? [], orderMap);

    setState((previous) => ({ ...previous, snippets: orderedSnippets }));
  };

  // Fetch primary action preference
  useEffect(() => {
    const fetch = async () => {
      const preferences = await getPreferenceValues();
      const primaryAction = preferences["primaryAction"];
      setState((previous) => ({ ...previous, primaryAction: primaryAction }));
    };
    fetch();
  }, []);

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const preferences = await getPreferenceValues();
        const path = preferences["folderPath"];

        const snippets = await loadAllSnippets(path);
        const folders = Array.from(
          new Set(
            snippets.map((i) => {
              return i.folder;
            })
          )
        );

        const lastCopiedMap = await getLastCopiedMap();
        await clearUnusedSnippets(snippets, lastCopiedMap);
        const orderedSnippets = orderSnippets(snippets, lastCopiedMap);
        setState((previous) => ({
          ...previous,
          snippets: orderedSnippets,
          filteredSnippets: orderedSnippets,
          folders: folders,
        }));
      } catch (err) {
        console.log(err);
        setState((previous) => ({
          ...previous,
          error: err instanceof Error ? err : new Error("Something went wrong"),
        }));
      }

      setState((previous) => ({ ...previous, isLoading: false }));
    };

    fetchData();
  }, []);

  if (state.error) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Error loading snippets ",
      message: "Make sure you are pointing to the right folder(s).",
    };
    showToast(options);
  }

  // Handle filter folder
  useEffect(() => {
    if (state.selectedFolder && state.selectedFolder != "all") {
      if (state.snippets) {
        const res = state.snippets.filter((snippet) => {
          return snippet.folder == state.selectedFolder;
        });

        setState((previous) => ({ ...previous, filteredSnippets: res }));
      }
    } else {
      setState((previous) => ({ ...previous, filteredSnippets: state.snippets }));
    }
  }, [state.selectedFolder]);

  return (
    <List
      searchBarPlaceholder="Type to search snippets"
      isLoading={state.isLoading}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter on folder"
          storeValue={true}
          onChange={(newValue) => {
            setState((previous) => ({ ...previous, selectedFolder: newValue }));
          }}
        >
          <List.Dropdown.Item title="All" value="all" />
          {state.folders &&
            state.folders.map((i) => {
              return <List.Dropdown.Item title={i} value={i} key={i} />;
            })}
        </List.Dropdown>
      }
    >
      {state.filteredSnippets &&
        state.filteredSnippets?.map((i) => {
          return (
            <List.Item
              id={i.id}
              key={i.id}
              title={i.name}
              subtitle={i.folder}
              keywords={i.content.content.split(" ").concat(i.content.rawMetadata.split(" "))}
              icon={Icon.TextDocument}
              detail={<SnippetContent snippet={i} />}
              actions={
                <>
                  <CustomActionPanel
                    handleAction={handleAction}
                    snippet={i}
                    primaryAction={state.primaryAction ?? ""}
                  />
                </>
              }
            ></List.Item>
          );
        })}
    </List>
  );
}
