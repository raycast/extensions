import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  Icon,
  LaunchProps,
  List,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { deleteSnippetFile, loadAllSnippets } from "./utils/snippets";
import { Location, Snippet, snippetTypesMap, zLaunchContext, ZSnippet } from "./utils/types";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import CreateSnippet from "./create-snippet";
import { XMLToFMObjects } from "./utils/FmClipTools";
import { useState, useEffect, useMemo } from "react";
import EditSnippet from "./components/edit-snippet";
import { uniqBy } from "lodash";
import EditSnippetXML from "./components/edit-snippet-xml";
import DynamicFieldsList from "./components/dynamic-fields-list";
import DynamicSnippetForm from "./components/dynamic-snippet.form";
import CreateDeeplinkForm from "./create-deeplink";
import { fetch } from "cross-fetch";

export default function Command(props: LaunchProps) {
  const [locations] = useCachedState<Location[]>("locations", []);
  const [loadedContext, setLoadedContext] = useState(false);
  const { push } = useNavigation();
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

  function copySnippet(snippet: Omit<Snippet, "locId">) {
    if (snippet.dynamicFields.length > 0) {
      // dynamic snippet, must show form
      push(<DynamicSnippetForm snippet={snippet} />);
    } else {
      // static snippet, just copy
      XMLToFMObjects(snippet.snippet)
        .then(() => {
          closeMainWindow();
          showHUD(`Copied ${snippet.type} to Clipboard`);
        })
        .catch((e) => {
          showToast({
            title: "Error",
            style: Toast.Style.Failure,
            message: e instanceof Error ? e.message : "Unknown error",
          });
        });
    }
  }
  async function loadContext() {
    // try to get info from launch context

    const parsed = zLaunchContext.safeParse(props.launchContext);
    if (!parsed.success) {
      console.error("Failed to parse launch context", parsed.error.issues);
      return;
    }

    console.log("parsed launch context", parsed.data);

    const ctx = parsed.data;
    if (ctx.type === "my") {
      const snippet = snippets.find((o) => o.id === ctx.id);
      if (!snippet) {
        console.error("Failed to find snippet for launch context", ctx);
        showHUD("Failed to find snippet");
        return;
      }

      // inject the values into the snippet's default values
      Object.entries(ctx.values).forEach(([key, value]) => {
        const i = snippet.dynamicFields.findIndex((f) => f.name === key);
        if (i < 0) return;
        snippet.dynamicFields[i].default = value;
      });

      if (ctx.showForm) {
        push(<DynamicSnippetForm snippet={snippet} />);
      } else {
        console.log("copying snippet in background", snippet.dynamicFields);
        copySnippet(snippet);
      }
    } else if (ctx.type === "import") {
      if (typeof ctx.snippet === "string") {
        console.log("importing snippet from string", ctx.snippet);
        await showToast({
          title: "Downloading Snippet",
          message: "This may take a few seconds",
          style: Toast.Style.Animated,
        });
        ctx.snippet = await fetch(ctx.snippet)
          .then((r) => r.json())
          .then((r) => ZSnippet.parse(r));
      }
      if (!ctx.snippet || typeof ctx.snippet !== "object") {
        console.error("Failed to find snippet for launch context", ctx);
        showHUD("Failed to load snippet");
        return;
      }

      if (ctx.action === "import") {
        push(<EditSnippet snippet={ctx.snippet} onSubmit={() => console.log("submited")} />);
      } else if (ctx.action === "copy") {
        // directly copy the snippet
        copySnippet(ctx.snippet);
      }
    }
  }

  useEffect(() => {
    if (loadedContext) return;
    if (isLoading) return;
    if (props.launchContext === undefined) return;

    // only run the rest of this function once
    setLoadedContext(true);

    console.log("loading context");
    loadContext();
  }, [snippets, isLoading, loadedContext]);

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
            accessories={getAccessories(snippet)}
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
                          <List.Item.Detail.Metadata.TagList.Item text={tag} key={tag} />
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
                  {snippet.dynamicFields.length > 0 ? (
                    <Action.Push
                      title="Load Snippet Form"
                      icon={Icon.Clipboard}
                      shortcut={{ key: "c", modifiers: ["cmd"] }}
                      target={<DynamicSnippetForm snippet={snippet} />}
                    />
                  ) : (
                    <Action
                      title="Copy Snippet"
                      icon={Icon.Clipboard}
                      shortcut={{ key: "c", modifiers: ["cmd"] }}
                      onAction={async () => {
                        try {
                          await XMLToFMObjects(snippet.snippet);
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
                  )}
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
                    title="Manage Dynamc Fields"
                    shortcut={{ key: "d", modifiers: ["opt"] }}
                    icon={Icon.Stars}
                    target={<DynamicFieldsList snippet={snippet} revalidate={revalidate} />}
                  />
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

                  <Action.Push
                    title="Create Deeplink..."
                    target={<CreateDeeplinkForm snippet={snippet} />}
                    icon={Icon.Link}
                  />
                  <Action.CopyToClipboard content={snippet.id} title="Copy Snippet ID" icon={Icon.Clipboard} />
                  {locationMap[snippet.locId]?.git || (
                    <Action.Push
                      title="Edit Snippet XML"
                      icon={Icon.Dna}
                      target={
                        <EditSnippetXML
                          onSubmit={() => {
                            revalidate();
                            pop();
                          }}
                          snippet={snippet}
                        />
                      }
                    />
                  )}
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
                      shortcut={{ key: "x", modifiers: ["ctrl"] }}
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

function getAccessories(snippet: Snippet): List.Item.Accessory[] {
  if (snippet.dynamicFields.length === 0) return [];
  return [{ icon: Icon.Stars, text: snippet.dynamicFields.length.toString() }];
}
