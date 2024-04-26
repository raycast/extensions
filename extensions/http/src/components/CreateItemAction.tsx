import { Action, Icon } from "@raycast/api";
import { Request, NewRequest } from "../types";
import ItemForm from "./ItemForm";

export default function CreateItemAction(props: { onCreate: (item: Request, index: number) => void }) {
  return (
    <Action.Push
      icon={Icon.NewDocument}
      title="Create New Request"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<ItemForm item={NewRequest()} index={-1} onCreate={props.onCreate} />}
    />
  );
}
