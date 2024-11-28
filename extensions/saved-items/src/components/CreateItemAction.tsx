import { Action, Icon } from "@raycast/api";
import ItemForm from "./ItemForm";

function CreateItemAction(props: { defaultTitle?: string; onCreate: (title: string, detail: string) => void }) {
  const handleSubmit = (id: string | undefined, title: string, detail: string) => {
    props.onCreate(title, detail);
  };

  return (
    <Action.Push
      icon={Icon.NewFolder}
      title="Create New Item"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<ItemForm defaultTitle={props.defaultTitle} onSubmit={handleSubmit} />}
    />
  );
}

export default CreateItemAction;
