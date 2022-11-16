import { Form, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import { Item } from "./types";
import { useForm, FormValidation } from "@raycast/utils";
import { nanoid } from "nanoid";

interface SignUpFormValues {
  id: string;
  title: string;
  path: string[];
  favourite: string;
}

export function SoundForm(props: { item?: Item; onEdit: (item: Item) => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<SignUpFormValues>({
    async onSubmit(values) {
      props.onEdit(props?.item ? { ...values, id: props.item.id } : { ...values, id: nanoid() });
      pop();
    },
    validation: {
      title: FormValidation.Required,
      path: FormValidation.Required,
    },
    initialValues: {
      title: props.item?.title,
      path: props.item?.path,
      favourite: props.item?.favourite,
    },
  });

  const favouriteItems = [
    { title: "Not added as favourite", value: "0" },
    { title: "Favourite #1", value: "1" },
    { title: "Favourite #2", value: "2" },
    { title: "Favourite #3", value: "3" },
    { title: "Favourite #4", value: "4" },
    { title: "Favourite #5", value: "5" },
    { title: "Favourite #6", value: "6" },
    { title: "Favourite #7", value: "7" },
    { title: "Favourite #8", value: "8" },
    { title: "Favourite #9", value: "9" },
    { title: "Favourite #10", value: "10" },
  ];

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.SaveDocument} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Enter Title" {...itemProps.title} />
      <Form.FilePicker allowMultipleSelection={false} info="Select an audio file" {...itemProps.path} />
      <Form.Separator />
      <Form.Description text="If you want to bind the sound to a hotkey you can then bind it to a favourite and give it a hotkey" />
      <Form.Dropdown title="Favorite" {...itemProps.favourite}>
        {favouriteItems.map((item) => (
          <Form.Dropdown.Item key={item.value} title={item.title} value={`${item.value}`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
