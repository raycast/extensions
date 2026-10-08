import { Form, showToast, Toast, ActionPanel, Action, useNavigation } from "@raycast/api";
import { FormValidation, MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import { createList } from "../api/lists";
import { TransformedList } from "../api/books";

interface CreateListFormValues {
  name: string;
  description: string;
  privacy_setting_id: string;
  default_view: string;
  ranked: boolean;
}

export default function CreateListForm({ mutateList }: { mutateList?: MutatePromise<TransformedList[], undefined> }) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateListFormValues>({
    async onSubmit(values) {
      try {
        showToast({
          style: Toast.Style.Animated,
          title: "Creating...",
        });
        const newList = await createList(
          values.name,
          values.privacy_setting_id,
          values.description,
          values.default_view,
          values.ranked,
        );
        if (mutateList) {
          await mutateList(Promise.resolve(newList));
        }
        showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: `Created list "${values.name}"`,
        });
        pop();
      } catch (error) {
        showFailureToast(error);
      }
    },
    validation: {
      name: FormValidation.Required,
      privacy_setting_id: FormValidation.Required,
      default_view: FormValidation.Required,
    },
    initialValues: {
      privacy_setting_id: "1",
      default_view: "Card",
      ranked: false,
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
      <Form.TextField title="List Name" autoFocus {...itemProps.name} />
      <Form.TextField title="Description" {...itemProps.description} />
      <Form.Dropdown title="Privacy Setting" {...itemProps.privacy_setting_id}>
        <Form.Dropdown.Item value="1" title="Public" />
        <Form.Dropdown.Item value="2" title="Friends only" />
        <Form.Dropdown.Item value="3" title="Private" />
      </Form.Dropdown>
      <Form.Dropdown title="Default View" {...itemProps.default_view}>
        <Form.Dropdown.Item value="Card" title="Card" />
        <Form.Dropdown.Item value="Table" title="Table" />
        <Form.Dropdown.Item value="Shelf" title="Shelf" />
      </Form.Dropdown>
      <Form.Checkbox
        title="Ordered List?"
        label=""
        info="In an ordered list, we'll show the position number of every book in the list and you can reorder it."
        {...itemProps.ranked}
      />
    </Form>
  );
}
