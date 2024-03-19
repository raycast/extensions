import { List } from "@raycast/api";

import FilterTasks from "./FilterTasks";

function Filter({ name }: { name: string }) {
  return (
    <List navigationTitle={name} searchBarPlaceholder="Filter tasks by a name">
      <FilterTasks name={name} />
    </List>
  );
}

export default Filter;
