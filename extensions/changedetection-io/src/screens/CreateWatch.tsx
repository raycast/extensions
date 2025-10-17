import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { CreateWatchFormValues } from "@/types";
import { callApi, validUrl } from "@/utils";

const CreateWatch = ({ onCreate }: { onCreate: () => void }) => {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateWatchFormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.title);
      try {
        await callApi("watch", {
          method: "POST",
          body: { ...values },
        });
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        onCreate();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      url: "https://",
      paused: true,
    },
    validation: {
      url(value) {
        if (!value) return "The item is required";
        if (!validUrl(value)) return "Must be a valid URL";
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Watch" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="URL" placeholder="https://..." info="URL to monitor for changes" {...itemProps.url} />
      <Form.Separator />
      <Form.TextField title="Title" info="Custom title for the watch" {...itemProps.title} />
      <Form.Checkbox label="Paused" info="Whether the watch is paused" {...itemProps.paused} />
      <Form.Checkbox label="Muted" info="Whether notifications are muted" {...itemProps.muted} />
      <Form.Dropdown title="Method" {...itemProps.method}>
        <Form.Dropdown.Item title="GET" value="GET" />
        <Form.Dropdown.Item title="POST" value="POST" />
        <Form.Dropdown.Item title="DELETE" value="DELETE" />
        <Form.Dropdown.Item title="PUT" value="PUT" />
      </Form.Dropdown>
    </Form>
  );
};

export default CreateWatch;
