import { ActionPanel, List } from "@raycast/api";
import { DevelopmentTool, DrupalWebsite, Filter } from "../interface";
import AddDrupalWebsiteAction from "./AddDrupalWebsiteAction";

function EmptyView(props: {
  drupalWebsites: DrupalWebsite[];
  filter: Filter;
  searchText: string;
  onCreate: (title: string, version: string, root: string, tool: DevelopmentTool) => void;
}) {
  if (props.drupalWebsites.length > 0) {
    return (
      <List.EmptyView
        icon="drupal-toolbox.png"
        title="No Matching Sites Found"
        description={`Press ⌘+N to add a site`}
        actions={
          <ActionPanel>
            <AddDrupalWebsiteAction defaultTitle={props.searchText} onCreate={props.onCreate} />
          </ActionPanel>
        }
      />
    );
  }
  return (
    <List.EmptyView
      icon="drupal-toolbox.png"
      title="No Sites Found"
      description="Press ⌘+N to add a site"
      actions={
        <ActionPanel>
          <AddDrupalWebsiteAction defaultTitle={props.searchText} onCreate={props.onCreate} />
        </ActionPanel>
      }
    />
  );
}
export default EmptyView;
