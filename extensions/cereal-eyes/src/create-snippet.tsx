import {
  Action,
  ActionPanel,
  environment,
  Form,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { createSnippet, resolveCredentials } from "./utils/api";
import { POPULAR_LANGUAGES, MORE_LANGUAGES } from "./utils/languages";
import type { SnippetCreatePayload } from "./types";

interface FormValues {
  title: string;
  content: string;
  language: string;
  is_public: boolean;
  expires_at: Date | null;
}

export default function CreateSnippet() {
  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    async onSubmit(values) {
      const { isMissingToken } = resolveCredentials();
      if (isMissingToken) {
        await showToast({
          style: Toast.Style.Failure,
          title: environment.isDevelopment
            ? "Dev API Token not set"
            : "API Token not set",
          message: "Add your token in extension preferences.",
          primaryAction: {
            title: "Open Preferences",
            onAction: openExtensionPreferences,
          },
        });
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Saving snippet…",
      });

      try {
        const payload: SnippetCreatePayload = {
          content: values.content,
        };

        if (values.title.trim()) {
          payload.title = values.title.trim();
        }

        if (values.language) {
          payload.language = values.language;
        }

        payload.is_public = values.is_public;

        if (values.expires_at) {
          payload.expires_at = values.expires_at.toISOString();
        }

        await createSnippet(payload);

        toast.style = Toast.Style.Success;
        toast.title = "Snippet saved";
        toast.primaryAction = {
          title: "Create Another",
          onAction: () => {
            reset();
            toast.hide();
          },
        };

        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to save snippet";
        toast.message =
          error instanceof Error ? error.message : "An unknown error occurred";
      }
    },
    validation: {
      content: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Create Snippet"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Snippet" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.title}
        title="Title"
        placeholder="My snippet (optional)"
      />

      <Form.TextArea
        {...itemProps.content}
        title="Content"
        placeholder="Paste or type your snippet content here…"
        enableMarkdown={false}
      />

      <Form.Dropdown {...itemProps.language} title="Language" defaultValue="">
        <Form.Dropdown.Item value="" title="No language" />

        <Form.Dropdown.Section title="Popular">
          {POPULAR_LANGUAGES.map((lang) => (
            <Form.Dropdown.Item
              key={lang.value}
              value={lang.value}
              title={lang.label}
            />
          ))}
        </Form.Dropdown.Section>

        <Form.Dropdown.Section title="More">
          {MORE_LANGUAGES.map((lang) => (
            <Form.Dropdown.Item
              key={lang.value}
              value={lang.value}
              title={lang.label}
            />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.Separator />

      <Form.Checkbox
        {...itemProps.is_public}
        title="Visibility"
        label="Public snippet"
        defaultValue={true}
      />

      <Form.DatePicker
        {...itemProps.expires_at}
        title="Expires At"
        type={Form.DatePicker.Type.DateTime}
      />
    </Form>
  );
}
