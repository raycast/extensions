import { FC } from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { Name } from "../interfaces";

export interface ListItemProps {
  name: Name;
  index: number;
  submit: () => void;
}

const getMarkdown = (name: Name) => {
  return `
  ## ${name.name}

  ---

  ${name.reason}
  `;
};

const ListItem: FC<ListItemProps> = ({ name, index, submit }) => (
  <List.Item
    accessories={[{ text: `#${index + 1}` }]}
    key={name.name}
    title={name.name}
    detail={<List.Item.Detail markdown={getMarkdown(name)} />}
    actions={
      <ActionPanel>
        <Action title="Naming" icon={Icon.Book} onAction={() => submit && submit()} />
      </ActionPanel>
    }
  />
);

export default ListItem;
