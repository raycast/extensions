import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { updateSnippet } from "./utils/api";
import { POPULAR_LANGUAGES, MORE_LANGUAGES } from "./utils/languages";
import type { Snippet, SnippetUpdatePayload } from "./types";

interface FormValues {
  title: string;
  content: string;
  language: string;
  is_public: boolean;
  expires_at: Date | null;
}

interface Props {
  snippet: Snippet;
  onRevalidate: () => void;
}

export default function EditSnippet({ snippet, onRevalidate }: Props) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      title: snippet.title ?? "",
      content: snippet.content,
      language: snippet.language ?? "",
      is_public: snippet.is_public,
      expires_at: snippet.expires_at ? new Date(snippet.expires_at) : null,
    },
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Saving changes…",
      });
      try {
        const payload: SnippetUpdatePayload = {
          content: values.content,
          title: values.title.trim() || null,
          language: values.language || null,
          is_public: values.is_public,
          expires_at: values.expires_at
            ? values.expires_at.toISOString()
            : null,
        };
        await updateSnippet(snippet.id, payload);
        toast.style = Toast.Style.Success;
        toast.title = "Snippet updated";
        onRevalidate();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update snippet";
        toast.message = error instanceof Error ? error.message : undefined;
      }
    },
    validation: {
      content: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Edit Snippet"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
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
      />

      <Form.DatePicker
        {...itemProps.expires_at}
        title="Expires At"
        type={Form.DatePicker.Type.DateTime}
      />
    </Form>
  );
}
