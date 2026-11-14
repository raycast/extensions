import { Action, ActionPanel, Form, Icon, Image, open, popToRoot, showToast, Toast } from "@raycast/api";
import { FormValidation, showFailureToast, useForm, usePromise } from "@raycast/utils";
import { APP_URL, createDraft, listChannels } from "./api";

type Values = {
  channels: string[];
  content: string;
};

export default function Command() {
  const { data: channels, isLoading } = usePromise(listChannels, [], {
    onError: (error) => {
      showFailureToast(error, { title: "Could not load your channels" });
    },
  });
  const activeChannels = (channels ?? []).filter((channel) => !channel.disabled);

  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Saving draft" });
      try {
        await createDraft(values.channels, values.content);
        toast.style = Toast.Style.Success;
        toast.title = "Draft saved";
        toast.message = `On ${values.channels.length} channel${values.channels.length === 1 ? "" : "s"}`;
        toast.primaryAction = {
          title: "Open Hookpost",
          onAction: () => open(`${APP_URL}/launches`),
        };
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not save the draft";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
    validation: {
      channels: (value) => (!value || value.length === 0 ? "Pick at least one channel" : undefined),
      content: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Draft" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
          <Action.OpenInBrowser title="Open Hookpost" url={`${APP_URL}/launches`} />
        </ActionPanel>
      }
    >
      <Form.TagPicker title="Channels" placeholder="Pick channels" {...itemProps.channels}>
        {activeChannels.map((channel) => (
          <Form.TagPicker.Item
            key={channel.id}
            value={channel.id}
            title={`${channel.name} (${channel.identifier})`}
            icon={channel.picture ? { source: channel.picture, mask: Image.Mask.Circle } : Icon.Person}
          />
        ))}
      </Form.TagPicker>
      <Form.TextArea title="Post" placeholder="What do you want to share?" {...itemProps.content} />
      <Form.Description text="Saved as a draft in Hookpost. Nothing is published until you schedule it there." />
    </Form>
  );
}
