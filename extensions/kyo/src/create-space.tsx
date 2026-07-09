import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { Spaces } from "./api/resources";
import { showKyoError } from "./lib/helpers";
import { LogOutAction } from "./components/AuthActions";

interface SpaceFormValues {
  name: string;
  status: string;
  image_url: string;
  notes: string;
  is_default: boolean;
}

export default function CreateSpace() {
  const { pop } = useNavigation();

  async function submit(values: SpaceFormValues) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }
    try {
      const space = await Spaces.create({
        name: values.name.trim(),
        status: values.status || undefined,
        image_url: values.image_url || undefined,
        notes: values.notes || undefined,
        is_default: values.is_default || undefined,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Space created",
        message: space.name,
      });
      pop();
    } catch (error) {
      await showKyoError(error, "Failed to create space");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Space"
            icon={Icon.Plus}
            onSubmit={submit}
          />
          <LogOutAction />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Acme (client space)"
      />
      <Form.TextField id="status" title="Status" placeholder="active" />
      <Form.TextField
        id="image_url"
        title="Image URL"
        placeholder="https://…"
      />
      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Context about this client…"
      />
      <Form.Checkbox id="is_default" label="Default space" />
    </Form>
  );
}
