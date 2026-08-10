import {
  useNavigation,
  showToast,
  Toast,
  Form,
  ActionPanel,
  Action,
  Icon,
  Detail,
  openExtensionPreferences,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { buildApiUrl, API_HEADERS, parseApiResponse } from "./kutt";
import { CreateLinkRequest, Link } from "./types";

export default function Command() {
  try {
    buildApiUrl();
    return <CreateLink />;
  } catch {
    return (
      <Detail
        markdown={"# ERROR \n\n Invalid URL in `Preferences`"}
        actions={
          <ActionPanel>
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }
}

function CreateLink() {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<CreateLinkRequest>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating link", values.target);
      try {
        const response = await fetch(buildApiUrl("links"), {
          method: "POST",
          headers: API_HEADERS,
          body: JSON.stringify(values),
        });
        const result = (await parseApiResponse(response)) as Link;
        await showToast(Toast.Style.Success, "Link created", result.link);
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create link";
        toast.message = `${error}`;
      }
    },
    validation: {
      target: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Link" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Target URL" placeholder="Paste your long URL" {...itemProps.target} />
      <Form.Separator />
      <Form.TextField title="Custom address" placeholder="Custom address" {...itemProps.customurl} />
      <Form.PasswordField title="Password" placeholder="Password" {...itemProps.password} />
      <Form.TextField title="Expire in" placeholder="2 minutes/hours/days" {...itemProps.expire_in} />
      <Form.TextField title="Description" placeholder="Description" {...itemProps.description} />
    </Form>
  );
}
