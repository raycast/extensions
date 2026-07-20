import { useNavigation, showToast, Toast, Form, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useFetch, useForm, FormValidation } from "@raycast/utils";
import { buildPostizApiUrl, POSTIZ_HEADERS, parsePostizResponse, CHANNEL_MAX_LENGTH } from "./postiz";
import { Identifier, Integration } from "./types";
const { postiz_version } = getPreferenceValues<Preferences>();

export default function CreatePost() {
  const { pop } = useNavigation();
  const { isLoading, data: channels } = useFetch(buildPostizApiUrl("integrations"), {
    headers: POSTIZ_HEADERS,
    mapResult(result: Integration[]) {
      return { data: result.filter((integration) => !integration.disabled) };
    },
    initialData: [],
  });
  type FormValues = {
    type: string;
    integrationId: string;
    date: Date | null;
    content: string;
  };
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating");
      const { date, ...rest } = values;
      // get all settings e.g. settings-x-who_can_reply_post
      const settingsEntries = Object.entries(rest).filter(([key]) => key.startsWith("settings-"));
      let settings: Record<string, string> | undefined;
      if (settingsEntries.length) {
        settings = {};
        // extract the key e.g. settings-x-who_can_reply_post -> who_can_reply_post
        settingsEntries.forEach(([key, value]) => {
          settings![key.split("-")[2]] = value;
        });
        // extract the type e.g. settings-x-who_can_reply_post -> x
        settings["__type"] = settingsEntries[0][0].split("-")[1];
      }
      try {
        const body = {
          type: values.type,
          date: date!.toISOString(),
          tags: [],
          shortLink: false,
          posts: [
            {
              integration: {
                id: values.integrationId,
              },
              value: [
                {
                  content: values.content,
                  ...(postiz_version === "2" && { image: [] }),
                },
              ],
              ...(postiz_version === "2" && { settings }),
            },
          ],
        };
        const response = await fetch(buildPostizApiUrl("posts"), {
          method: "POST",
          headers: POSTIZ_HEADERS,
          body: JSON.stringify(body),
        });
        await parsePostizResponse(response);
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      date: new Date(),
    },
    validation: {
      type: FormValidation.Required,
      integrationId: FormValidation.Required,
      date: FormValidation.Required,
      content: FormValidation.Required,
    },
  });

  const selectedChannel = channels.find((channel) => channel.id === values.integrationId);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Type" {...itemProps.type}>
        <Form.Dropdown.Item icon={Icon.Pencil} title="Draft" value="draft" />
      </Form.Dropdown>
      <Form.Dropdown title="Channel" {...itemProps.integrationId}>
        {channels.map((channel) => (
          <Form.Dropdown.Item
            key={channel.id}
            icon={channel.picture}
            title={`${channel.profile} (${channel.identifier})`}
            value={channel.id}
          />
        ))}
      </Form.Dropdown>
      <Form.DatePicker type={Form.DatePicker.Type.Date} {...itemProps.date} />
      <Form.TextArea title="Content" {...itemProps.content} />
      {selectedChannel && CHANNEL_MAX_LENGTH[selectedChannel.identifier] && (
        <Form.Description text={`${values.content?.length || 0}/${CHANNEL_MAX_LENGTH[selectedChannel.identifier]}`} />
      )}
      {postiz_version === "2" && selectedChannel?.identifier === Identifier.X && (
        <>
          <Form.Separator />
          <Form.Description text="Settings (X)" />
          <Form.Dropdown id="settings-x-who_can_reply_post" title="Who can reply to this post?">
            <Form.Dropdown.Item title="Everyone" value="everyone" />
            <Form.Dropdown.Item title="Accounts you follow" value="following" />
            <Form.Dropdown.Item title="Mentioned accounts" value="mentionedUsers" />
            <Form.Dropdown.Item title="Subscribers" value="subscribers" />
            <Form.Dropdown.Item title="Verified accounts" value="verified" />
          </Form.Dropdown>
          <Form.TextField
            id="settings-x-community"
            title="Post to a community, URL"
            placeholder="https://x.com/i/communities/1493446837214187523"
          />
        </>
      )}
    </Form>
  );
}
