import { Icon, List, showToast, Toast, ActionPanel, Action, getPreferenceValues } from "@raycast/api";

import { useEffect, useState } from "react";
import type { Snippet, State } from "./types";
import SnippetContent from "./components/SnippetContent";
import CustomActionPanel from "./components/CustomActionPanel";
import { storeLastCopied, clearUnusedSnippets, orderSnippets } from "./utils/LocalStorageHelper";
import { expandHomeDirectory, loadAllSnippets } from "./utils/SnippetsLoader";

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
      const allPathsTmp = preferences["secondaryFolderPaths"]
        ? [path, ...preferences["secondaryFolderPaths"].split(",")]
        : [path];
      const allPaths = Array.from(new Set(allPathsTmp.map(expandHomeDirectory)));

      const snippetsPromises = allPaths.map(loadAllSnippets);
      const snippetsArrays = await Promise.all(snippetsPromises);
      const snippets = snippetsArrays.flatMap(({ snippets }) => snippets);
      const errors = snippetsArrays.flatMap(({ errors }) => errors);

      const folders = Array.from(
        new Set(
          snippets.map((i) => {
            return i.folder;
          })
        )
      );

      const tags = Array.from(
        new Set(
          snippets.flatMap((i) => {
            return i.content.tags ?? [];
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
        tags: tags,
        paths: allPaths,
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
    if (state.selectedFilter && state.selectedFilter != "all") {
      const handleFilterByFolder = (snippet: Snippet, filterValue: string) => {
        return snippet.folder == filterValue;
      };
      const handleFilterByTags = (snippet: Snippet, filterValue: string) => {
        return snippet.content.tags?.includes(filterValue);
      };

      if (state.snippets) {
        let handleFilterMethod = (_: Snippet) => true;
        if (state.selectedFilter.startsWith("folder:")) {
          const filterValue = state.selectedFilter.substring("folder:".length);
          handleFilterMethod = (snippet: Snippet) => {
            return handleFilterByFolder(snippet, filterValue);
          };
        } else if (state.selectedFilter.startsWith("tag:")) {
          const filterValue = state.selectedFilter.substring("tag:".length);
          handleFilterMethod = (snippet: Snippet) => {
            return handleFilterByTags(snippet, filterValue);
          };
        }

        const res = state.snippets.filter(handleFilterMethod);
        setState((previous) => ({ ...previous, filteredSnippets: res }));
      }
    } else {
      setState((previous) => ({ ...previous, filteredSnippets: state.snippets }));
    }
  }, [state.selectedFilter]);

  if (state.errors && state.errors.length != 0) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Error loading snippets.",
      message: state.errors?.map((e) => e.message).join("\n"),
    };
    showToast(options);
  }

  const loadSnippetsView = state.filteredSnippets && state.filteredSnippets.length != 0;
  return (
    <List
      searchBarPlaceholder="Type to search snippets"
      isLoading={state.isLoading}
      isShowingDetail={loadSnippetsView}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter on folder"
          storeValue={true}
          onChange={(newValue) => {
            setState((previous) => ({ ...previous, selectedFilter: newValue }));
          }}
        >
          <List.Dropdown.Item title="All" value="all" />
          {state.folders && state.folders.length != 1 && (
            <List.Dropdown.Section title="Folders">
              {state.folders.map((i) => {
                return <List.Dropdown.Item title={i} value={`folder:${i}`} key={i} />;
              })}
            </List.Dropdown.Section>
          )}
          {state.tags && state.tags.length != 0 && (
            <List.Dropdown.Section title="Tags">
              {state.tags.map((i) => {
                return <List.Dropdown.Item title={i} value={`tag:${i}`} key={i} />;
              })}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {!loadSnippetsView && (
        <List.EmptyView
          icon={Icon.Snippets}
          title="No Snippets."
          description="Why not create a few?

            Visit https://www.raycast.com/astronight/snippetsurfer for examples."
          actions={
            <ActionPanel>
              <Action
                title="Reload Snippets"
                icon={Icon.RotateAntiClockwise}
                onAction={fetchData}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      )}
      {loadSnippetsView &&
        state.filteredSnippets?.map((i) => {
          return (
            <List.Item
              id={i.id}
              key={i.id}
              title={i.name}
              accessories={[{ icon: Icon.Folder, text: i.folder && i.folder !== "." ? i.folder : "" }]}
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
                    paths={state.paths ?? []}
                  />
                </>
              }
            ></List.Item>
          );
        })}
    </List>
  );
}
