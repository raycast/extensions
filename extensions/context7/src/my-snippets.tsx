import { Action, ActionPanel, Alert, Icon, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { showErrorToast } from "./lib/error-utils";
import { countOf } from "./lib/text";
import { buildCapturedAccessory } from "./lib/library-format";
import { clearMySnippets, getMySnippets } from "./lib/my-snippets";
import { SnippetRow } from "./components/snippet-row";
import type { SavedSnippet } from "./lib/types";

const ALL_LIBRARIES = "all";

export default function MySnippetsCommand() {
  const [snippets, setSnippets] = useState<SavedSnippet[]>([]);
  const [libraryFilter, setLibraryFilter] = useState(ALL_LIBRARIES);
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingDetail, setIsShowingDetail] = useState(true);

  useEffect(() => {
    void refresh();
  }, []);

  // The point of this command is spanning libraries, so provenance is a filter, not a section.
  const libraries = useMemo(() => {
    const byId = new Map<string, string>();
    snippets.forEach((snippet) => byId.set(snippet.libraryId, snippet.libraryName));

    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [snippets]);

  const visibleSnippets = useMemo(
    () =>
      (libraryFilter === ALL_LIBRARIES ? snippets : snippets.filter((snippet) => snippet.libraryId === libraryFilter))
        .slice()
        .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()),
    [snippets, libraryFilter],
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && visibleSnippets.length > 0}
      searchBarPlaceholder="Search my snippets..."
      searchBarAccessory={
        <List.Dropdown tooltip="Library" value={libraryFilter} storeValue onChange={setLibraryFilter}>
          <List.Dropdown.Item title="All My Libraries" value={ALL_LIBRARIES} />
          <List.Dropdown.Section title="My Libraries">
            {libraries.map(([id, name]) => (
              <List.Dropdown.Item key={id} title={name} value={id} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Star}
        title="No Saved Snippets"
        description="Add a snippet from Search Documentation and it is kept here, across every library."
      />

      {visibleSnippets.map((snippet) => {
        const captured = buildCapturedAccessory(snippet.savedAt, "Saved on");

        return (
          <SnippetRow
            key={snippet.key}
            snippet={snippet}
            library={{ id: snippet.libraryId, name: snippet.libraryName }}
            isSaved={true}
            onSavedChange={refresh}
            isShowingDetail={isShowingDetail}
            onToggleDetail={() => setIsShowingDetail((showing) => !showing)}
            listOnlyAccessories={captured ? [captured] : undefined}
            showLibraryTag
            extraActions={
              <ActionPanel.Section>
                <Action
                  title="Remove All Snippets"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  onAction={handleRemoveAll}
                />
              </ActionPanel.Section>
            }
          />
        );
      })}
    </List>
  );

  async function refresh() {
    setIsLoading(true);

    try {
      setSnippets(await getMySnippets());
    } catch (error) {
      await showErrorToast("Could Not Load My Snippets", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemoveAll() {
    const confirmed = await confirmAlert({
      title: "Remove All Snippets?",
      message: `This removes ${countOf(snippets.length, "snippet")} and cannot be undone.`,
      icon: Icon.Trash,
      primaryAction: { title: "Remove All", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    try {
      setSnippets(await clearMySnippets());
      await showToast({ style: Toast.Style.Success, title: "Removed All Snippets" });
    } catch (error) {
      await showErrorToast("Could Not Remove Snippets", error);
    }
  }
}
