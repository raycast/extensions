import { ActionPanel, List } from "@raycast/api";
import CreateTodoAction from "./actions/website-add";

interface ViewEmptyInterface {
  onCreate: (url: string) => void;
}

export const ViewEmpty = ({ onCreate }: ViewEmptyInterface) => {
  return (
    <List.EmptyView
      title="No websites found"
      description="You have not added any websites yet. Why not add some?"
      actions={
        <ActionPanel>
          <CreateTodoAction onCreate={onCreate} />
        </ActionPanel>
      }
    />
  );
};
export default ViewEmpty;
