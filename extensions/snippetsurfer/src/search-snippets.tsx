import { Icon, List, showToast, Toast, getPreferenceValues } from "@raycast/api";

import { useEffect, useState } from "react";
import type { Snippet, State } from "./types";
import SnippetContent from "./components/SnippetContent";
import CustomActionPanel from "./components/CustomActionPanel";
import { storeLastCopied, clearUnusedSnippets, orderSnippets } from "./utils/LocalStorageHelper";
import { loadAllSnippets } from "./utils/SnippetsLoader";

export default function Command() {
  const [state, setState] = useState<State>({ snippets: [], isLoading: true });

  const handleAction = async function (snippet: Snippet) {
    await storeLastCopied(snippet);

    const orderedSnippets = await orderSnippets(state.snippets ?? []);
    const filteredSnippets = await orderSnippets(state.filteredSnippets ?? state.snippets ?? []);
    setState((previous) => ({ ...previous, snippets: orderedSnippets, filteredSnippets: filteredSnippets }));
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
  const fetchData = async () => {
    try {
      const preferences = await getPreferenceValues();
      const path = preferences["folderPath"];

      const { snippets, errors } = await loadAllSnippets(path);
      const folders = Array.from(
        new Set(
          snippets.map((i) => {
            return i.folder;
          })
        )
      );

      await clearUnusedSnippets(snippets);
      const orderedSnippets = await orderSnippets(snippets);

      setState((previous) => ({
        ...previous,
        snippets: orderedSnippets,
        filteredSnippets: orderedSnippets,
        folders: folders,
        rootPath: path,
        errors: errors,
      }));
    } catch (err) {
      setState((previous) => ({
        ...previous,
        errors: [err instanceof Error ? err : new Error("Something went wrong")],
      }));
    }

    setState((previous) => ({ ...previous, isLoading: false }));
  };
  useEffect(() => {
    fetchData();
  }, []);

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

  if (state.errors && state.errors.length != 0) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Error loading snippets.",
      message: state.errors?.map((e) => e.message).join("\n"),
    };
    showToast(options);
  }

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
              accessories={[{ icon: Icon.Folder, text: i.folder }]}
              keywords={[i.folder, ...i.content.content.split(" ").concat(i.content.rawMetadata.split(" "))]}
              icon={Icon.Document}
              detail={<SnippetContent snippet={i} />}
              actions={
                <>
                  <CustomActionPanel
                    handleAction={handleAction}
                    snippet={i}
                    primaryAction={state.primaryAction ?? ""}
                    reloadSnippets={fetchData}
                    rootPath={state.rootPath ?? ""}
                  />
                </>
              }
            ></List.Item>
          );
        })}
    </List>
  );
}
