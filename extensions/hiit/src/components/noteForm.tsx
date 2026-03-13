import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { Item, NoteFormValues } from "../types";
import { useForm } from "@raycast/utils";

export function NoteForm(props: { item: Item; onSave: (item: Item) => void }) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<NoteFormValues>({
    async onSubmit(values) {
      props.onSave({ ...props.item, note: values.note });
      pop();
    },

    initialValues: {
      note: props.item?.note,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Note" placeholder="It was soooo hard!" {...itemProps.note} />
    </Form>
  );
}
