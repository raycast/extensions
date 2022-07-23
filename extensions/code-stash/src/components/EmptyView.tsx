import { ActionPanel, Icon, List } from "@raycast/api";
import { CodeStash } from "../types";
import CreateAction from "./CreateAction";

function EmptyView(props: {
  codeStashes: CodeStash[];
  searchText: string;
  onCreate: (title: string, code: string, language: string) => void;
}) {
  if (props.codeStashes.length > 0) {
    return (
      <List.EmptyView
        icon="😕"
        title="Oops, nothing found"
        description={`Can't find a Code Stash matching \n'${props.searchText}'`}
        actions={
          <ActionPanel>
            <CreateAction defaultTitle={props.searchText} onCreate={props.onCreate} />
          </ActionPanel>
        }
      />
    );
  } else {
    return (
      <List.EmptyView
        icon={Icon.Terminal}
        title="No Code Stashes found"
        description="Press '↩' to create one."
        actions={
          <ActionPanel>
            <CreateAction defaultTitle={props.searchText} onCreate={props.onCreate} />
          </ActionPanel>
        }
      />
    );
  }
}
export default EmptyView;
