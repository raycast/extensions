import { ActionPanel, Action, Form, Icon, showToast, Toast, useNavigation, LaunchProps, Color } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { createList } from "swift:../swift/AppleReminders";

import { useData } from "./hooks/useData";

type NewList = {
  title: string;
  color?: string;
};

type CreateListValues = {
  title: string;
  color: string;
};

type CreateListFormProps = {
  draftValues?: Partial<CreateListValues>;
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

export function CreateListForm({ draftValues }: CreateListFormProps) {
  const { pop } = useNavigation();
  const { mutate } = useData();

  const { itemProps, handleSubmit } = useForm<CreateListValues>({
    initialValues: {
      title: draftValues?.title ?? "",
      color: draftValues?.color ?? colorOptions[0].value,
    },
    validation: {
      title: FormValidation.Required,
    },
    async onSubmit(values) {
      try {
        const payload: NewList = {
          title: values.title,
          color: values.color,
        };

        const list = await createList(payload);

        await showToast({
          style: Toast.Style.Success,
          title: "Created List",
          message: list.title,
        });

        await mutate();
        pop();
      } catch (error) {
        console.log(error);
        const message = error instanceof Error ? error.message : JSON.stringify(error);

        await showToast({
          style: Toast.Style.Failure,
          title: "Unable to create list",
          message,
        });
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} onSubmit={handleSubmit} title="Create List" />
        </ActionPanel>
      }
      enableDrafts
    >
      <Form.TextField {...itemProps.title} title="Title" placeholder="New List" />
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

export default function Command({ draftValues }: LaunchProps<{ draftValues: CreateListValues }>) {
  return <CreateListForm draftValues={draftValues} />;
}
