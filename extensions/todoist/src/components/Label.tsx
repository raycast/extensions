import { List } from "@raycast/api";

import LabelTasks from "./LabelTasks";

function Label({ name }: { name: string }) {
  return (
    <List navigationTitle={name} searchBarPlaceholder="Filter tasks by name, priority, or project name">
      <LabelTasks name={name} />
    </List>
  );
}

export default Label;
