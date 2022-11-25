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
        title="No matching Drupal websites found"
        description={`Can't find a Drupal website matching ${props.searchText}.\nAdd it now!`}
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
      title="No Drupal websites found"
      description="You don't have any Drupal websites yet. Why not add some?"
      actions={
        <ActionPanel>
          <AddDrupalWebsiteAction defaultTitle={props.searchText} onCreate={props.onCreate} />
        </ActionPanel>
      }
    />
  );
}
export default EmptyView;
