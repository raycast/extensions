import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import TagFilesView from "./components/tag-files-view";
import SearchFilesByTag from "./search-files-by-tag";
import { errorMessage, SettingsActions } from "./components/shared";
import { selectedPaths } from "./lib/service";

export default function Command() {
  const { data, error, isLoading, revalidate } = usePromise(selectedPaths);
  if (data?.length) return <TagFilesView paths={data} closeAfterTagging />;
  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        title={error ? "Could Not Read Finder Selection" : "No Files Selected"}
        description={error ? errorMessage(error) : "Select files in Finder, then open this command to tag them."}
        icon={Icon.Finder}
        actions={
          <ActionPanel>
            <Action.Push title="Search Files by Tag" icon={Icon.MagnifyingGlass} target={<SearchFilesByTag />} />
            <Action title="Reload Finder Selection" icon={Icon.ArrowClockwise} onAction={revalidate} />
            <SettingsActions />
          </ActionPanel>
        }
      />
    </List>
  );
}
