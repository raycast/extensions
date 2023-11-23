import { Action, Icon } from "@raycast/api";
import ItemForm from "./ItemForm";

type ItemToEdit = {
  id: string;
  title: string;
  detail: string;
};

type EditItemActionProps = {
  itemToEdit: ItemToEdit;
  onEdit: (id: string, title: string, detail: string) => void;
};

function EditItemAction({ itemToEdit, onEdit }: EditItemActionProps) {
  const handleSubmit = (id: string | undefined, title: string, detail: string) => {
    if (id === undefined) {
      throw new Error("ID should not be undefined");
    }
    onEdit(id, title, detail);
  };

  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Edit"
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      target={
        <ItemForm
          id={itemToEdit.id}
          defaultTitle={itemToEdit.title}
          defaultDetail={itemToEdit.detail}
          onSubmit={handleSubmit}
        />
      }
    />
  );
}

export default EditItemAction;
