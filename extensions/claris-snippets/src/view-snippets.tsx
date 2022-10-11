import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  closeMainWindow,
  confirmAlert,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { deleteSnippetFile, loadAllSnippets } from "./utils/snippets";
import { Location, snippetTypesMap } from "./utils/types";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import CreateSnippet from "./create-snippet";
import { XMLToFMObjects } from "./utils/FmClipTools";
import { useState, useMemo } from "react";
import EditSnippet from "./components/edit-snippet";
import { uniqBy } from "lodash";

export default function Command() {
  const [locations] = useCachedState<Location[]>("locations", []);
  const locationMap = useMemo(() => {
    const map: Record<string, Location> = {};
    locations.forEach((location) => {
      map[location.id] = location;
    });
    return map;
  }, [locations]);
  const {
    data: snippets,
    isLoading,
    revalidate,
  } = useCachedPromise(async () => loadAllSnippets(locations), [], { initialData: [] });
  const [pathFilter, setPathFilter] = useState<"all" | "default" | Location>("all");
  const { pop } = useNavigation();

  function CreateSnippetAction() {
    return (
      <Action.Push
        title="Create Snippet"
        icon={Icon.Plus}
        shortcut={{ key: "n", modifiers: ["cmd"] }}
        target={<CreateSnippet onPop={revalidate} />}
      />
    );
  }

  const filteredSnippets = uniqBy(
    pathFilter === "all"
      ? snippets
      : pathFilter === "default"
      ? snippets.filter((snippet) => snippet.locId === "default")
      : snippets.filter((snippet) => snippet.locId === pathFilter.id),
    "id"
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Snippet Locations"
          storeValue
          defaultValue="all"
          onChange={(newValue) => {
            if (newValue === "all" || newValue === "default") {
              setPathFilter(newValue);
            } else {
              const foundLocation = locations.find((l) => l.id === newValue);
              if (foundLocation) setPathFilter(foundLocation);
            }
          }}
        >
          <List.Dropdown.Section>
            <List.Dropdown.Item title={"Show All"} value="all" />
          </List.Dropdown.Section>
          <List.Dropdown.Section>
            <List.Dropdown.Item title="Default" value={"default"} icon={Icon.Star} />
            {locations.map((location) => (
              <List.Dropdown.Item title={location.name} key={location.id} value={location.id} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <CreateSnippetAction />
        </ActionPanel>
      }
    >
      {filteredSnippets
        .sort((a, b) => a.name.localeCompare(b.name)) // sort by snippet name
        .map((snippet) => (
          <List.Item
            title={snippet.name}
            key={snippet.id}
            id={snippet.id}
            keywords={snippet.tags}
            detail={
              <List.Item.Detail
                markdown={`${snippet.description === "" ? "*No Description*" : snippet.description}

---
${snippet.snippet}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Type" text={snippetTypesMap[snippet.type]} />
                    <List.Item.Detail.Metadata.Label
                      title="Location"
                      text={
                        snippet.locId === "default"
                          ? "My Computer"
                          : locations.find((l) => l.id === snippet.locId)?.name ?? "Unknown"
                      }
                    />
                    <List.Item.Detail.Metadata.TagList title="Keywords">
                      {snippet.tags
                        .filter((s) => s !== "")
                        .map((tag) => (
                          <List.Item.Detail.Metadata.TagList.Item text={tag} />
                        ))}
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
            //   subtitle={snippetTypesMap[snippet.type]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Copy Snippet"
                    icon={Icon.Clipboard}
                    shortcut={{ key: "c", modifiers: ["cmd"] }}
                    onAction={async () => {
                      await Clipboard.copy(snippet.snippet);
                      try {
                        XMLToFMObjects();
                        closeMainWindow();
                        showHUD("Copied to Clipboard");
                      } catch (e) {
                        showToast({
                          title: "Error",
                          style: Toast.Style.Failure,
                          message: e instanceof Error ? e.message : "Unknown error",
                        });
                      }
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Raw Text"
                    icon={Icon.Text}
                    shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
                    content={snippet.snippet}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {locationMap[snippet.locId]?.git || (
                    <Action.Push
                      title="Edit Snippet"
                      icon={Icon.Pencil}
                      shortcut={{ key: "e", modifiers: ["cmd"] }}
                      target={
                        <EditSnippet
                          onSubmit={() => {
                            revalidate();
                            pop();
                          }}
                          snippet={snippet}
                        />
                      }
                    />
                  )}
                  <Action.Push
                    title="Duplicate Snippet"
                    shortcut={{ key: "d", modifiers: ["cmd"] }}
                    icon={Icon.Link}
                    target={
                      <EditSnippet
                        onSubmit={() => {
                          revalidate();
                          pop();
                        }}
                        snippet={{
                          ...snippet,
                          id: undefined,
                          locId: locationMap[snippet.locId]?.git ? "default" : snippet.locId,
                        }}
                      />
                    }
                  />
                  <CreateSnippetAction />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.ShowInFinder
                    path={snippet.path}
                    title="Reveal in Finder"
                    icon={Icon.Finder}
                    shortcut={{ key: "r", modifiers: ["cmd", "opt"] }}
                  />
                  {/* <Action
                    title="Export Snippet"
                    icon={Icon.Upload}
                    shortcut={{ key: "e", modifiers: ["cmd", "shift"] }}
                  /> */}
                </ActionPanel.Section>
                {locationMap[snippet.locId]?.git || (
                  <ActionPanel.Section>
                    <Action
                      title="Delete Snippet"
                      icon={Icon.Trash}
                      shortcut={{ key: "delete", modifiers: ["cmd"] }}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        if (
                          await confirmAlert({
                            title: "Are you sure?",
                            message: "This will permanently delete the snippet. This cannot be undone.",
                            primaryAction: { style: Alert.ActionStyle.Destructive, title: "Delete" },
                          })
                        ) {
                          deleteSnippetFile(snippet);
                          revalidate();
                        }
                      }}
                    />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
