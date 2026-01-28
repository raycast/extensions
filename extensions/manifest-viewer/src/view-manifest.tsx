import React, { useState } from "react";
import { LaunchProps, List, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import ManifestView from "./components/ManifestView";

interface ViewManifestArguments {
  url?: string;
}

export default function ViewManifest(props: LaunchProps<{ arguments: ViewManifestArguments }>) {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState<string>(props.arguments.url || "");

  if (props.arguments.url) {
    return <ManifestView url={props.arguments.url} isRoot={true} />;
  }

  const handleLoadManifest = () => {
    if (searchText.trim()) {
      push(<ManifestView url={searchText} isRoot={true} />);
    }
  };

  return (
    <List searchText={searchText} onSearchTextChange={setSearchText} searchBarPlaceholder="Enter URL...">
      <List.EmptyView
        title="Load Content"
        description="Enter a URL and press Enter to load"
        actions={
          <ActionPanel>
            <Action title="Load URL" icon={Icon.Download} onAction={handleLoadManifest} />
            <Action.OpenInBrowser url={searchText} title="Open in Browser" />
          </ActionPanel>
        }
      />
    </List>
  );
}
