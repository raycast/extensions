import { useNavigation, showToast, Toast, Form, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useFetch, useForm, FormValidation } from "@raycast/utils";
import { buildPostizApiUrl, POSTIZ_HEADERS, parsePostizResponse } from "./postiz";
import { Integration } from "./types";
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
    content: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating");
      try {
        const body = {
          type: values.type,
          date: new Date().toISOString(),
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
    validation: {
      type: FormValidation.Required,
      integrationId: FormValidation.Required,
      content: FormValidation.Required,
    },
  });
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
      <Form.TextArea title="Content" {...itemProps.content} />
    </Form>
  );
}
