import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  closeMainWindow,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { DOWNLOAD_URL, isDevToolsInstalled, openLink, searchLink, toolLink } from "./devtools";
import { loadTools } from "./tools";

async function launch(link: string) {
  try {
    await openLink(link);
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open DevTools",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Also works as a Raycast fallback command: text typed in the root search becomes the search. */
export default function SearchTools(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const { data: installed, isLoading: checkingInstall } = usePromise(isDevToolsInstalled);
  const { data, isLoading: loadingTools } = usePromise(loadTools);
  const tools = data?.tools ?? [];
  const categories = [...new Set(tools.map((tool) => tool.category))];

  if (installed === false) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Download}
          title="DevTools is not installed"
          description="Install DevTools 2.1 or later, then search again."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Download DevTools" url={DOWNLOAD_URL} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={checkingInstall || loadingTools}
      searchBarPlaceholder="Search DevTools tools"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={{ keepSectionOrder: true }}
    >
      {categories.map((category) => (
        <List.Section key={category} title={category}>
          {tools
            .filter((tool) => tool.category === category)
            .map((tool) => (
              <List.Item
                key={tool.id}
                icon={{ source: "icon.png" }}
                title={tool.name}
                accessories={[{ text: tool.category }]}
                keywords={[tool.category, ...tool.keywords]}
                actions={
                  <ActionPanel>
                    <Action title="Open in DevTools" icon={Icon.AppWindow} onAction={() => launch(toolLink(tool.id))} />
                    <Action.CopyToClipboard
                      title="Copy Link to Tool"
                      content={toolLink(tool.id)}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action
                      title="Search in DevTools"
                      icon={Icon.MagnifyingGlass}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                      onAction={() => launch(searchLink(tool.name))}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
