import { CodeSmell } from "./data/types";
import { List } from "@raycast/api";
import { Smells } from "./components/smells";

type ListFilteredProps = {
  smells: CodeSmell[];
  categoryName: string;
};

export const ListFiltered = (props: ListFilteredProps) => {
  return (
    <List searchBarPlaceholder={`Showing ${props.smells.length} ${props.categoryName}`}>
      <Smells smells={props.smells} />
    </List>
  );
};
