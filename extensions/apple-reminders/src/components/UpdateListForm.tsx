import { ActionPanel, Action, Form, Icon, showToast, Toast, useNavigation, Color } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { updateList } from "swift:../../swift/AppleReminders";

import { List } from "../hooks/useData";

type UpdateListValues = {
  title: string;
  color: string;
};

type UpdateListFormProps = {
  list: List;
  onUpdate: () => Promise<void>;
};

const colorOptions = [
  { title: "Red", value: "#FF3B30", color: Color.Red },
  { title: "Orange", value: "#FF9500", color: Color.Orange },
  { title: "Yellow", value: "#FFCC00", color: Color.Yellow },
  { title: "Green", value: "#34C759", color: Color.Green },
  { title: "Blue", value: "#007AFF", color: Color.Blue },
  { title: "Purple", value: "#AF52DE", color: Color.Purple },
  { title: "Magenta", value: "#FF2D55", color: Color.Magenta },
  { title: "Brown", value: "#A2845E", color: "#A2845E" },
  { title: "Gray", value: "#8E8E93", color: Color.SecondaryText },
];

export function UpdateListForm({ list, onUpdate }: UpdateListFormProps) {
  const { pop } = useNavigation();

  const { itemProps, handleSubmit } = useForm<UpdateListValues>({
    initialValues: {
      title: list.title,
      color: list.color,
    },
    validation: {
      title: FormValidation.Required,
    },
    async onSubmit(values) {
      try {
        const payload = {
          listId: list.id,
          title: values.title !== list.title ? values.title : undefined,
          color: values.color !== list.color ? values.color : undefined,
        };

        const updatedList = await updateList(payload);

        await showToast({
          style: Toast.Style.Success,
          title: "Updated List",
          message: updatedList.title,
        });

        await onUpdate();
        pop();
      } catch (error) {
        console.log(error);
        const message = error instanceof Error ? error.message : JSON.stringify(error);

        await showToast({
          style: Toast.Style.Failure,
          title: "Unable to update list",
          message,
        });
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} title="Update List" />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.title} title="Title" placeholder={list.title} />
      <Form.Dropdown {...itemProps.color} title="Color">
        {colorOptions.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            title={option.title}
            value={option.value}
            icon={{ source: Icon.Circle, tintColor: option.color }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
