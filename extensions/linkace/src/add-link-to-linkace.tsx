import { Action, ActionPanel, Clipboard, Form, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

interface FormValues {
  url: string;
  title?: string;
  description?: string;
  tags?: string;
  isPrivate: boolean;
}

interface LinkAceResponse {
  id?: number;
  url?: string;
  title?: string;
  message?: string;
  error?: string;
}

export default function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      await addLinkToLinkAce(values);
    },
    initialValues: {
      url: "",
      title: "",
      description: "",
      tags: preferences.defaultTags || "",
      isPrivate: preferences.isPrivateByDefault || false,
    },
    validation: {
      url: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Link" onSubmit={handleSubmit} />
          <Action
            title="Paste URL from Clipboard"
            onAction={async () => {
              const clipboardText = await Clipboard.readText();
              if (clipboardText) {
                itemProps.url.onChange?.(clipboardText);
              }
            }}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.url} title="URL" placeholder="https://example.com" />
      <Form.TextField {...itemProps.title} title="Title" placeholder="Optional title for the link" />
      <Form.TextArea {...itemProps.description} title="Description" placeholder="Optional description" />
      <Form.TextField {...itemProps.tags} title="Tags" placeholder="Comma-separated tags" />
      <Form.Checkbox {...itemProps.isPrivate} label="Private Link" />
    </Form>
  );
}

async function addLinkToLinkAce(values: FormValues) {
  const preferences = getPreferenceValues<Preferences>();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Adding link to LinkAce...",
  });

  try {
    // Ensure API URL doesn't have trailing slash
    const apiUrl = preferences.apiUrl.replace(/\/$/, "");
    const endpoint = `${apiUrl}/api/v2/links`;

    // Prepare tags array
    const tagsArray = values.tags
      ? values.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : [];

    // Prepare request body
    const body = {
      url: values.url,
      title: values.title || undefined,
      description: values.description || undefined,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      is_private: values.isPrivate ? 1 : 0,
    };

    // Make API request
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${preferences.apiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data: LinkAceResponse = await response.json();

    // Check if link was successfully created (has an ID)
    if (response.ok && data.id) {
      toast.style = Toast.Style.Success;
      toast.title = "Link successfully saved!";
      toast.message = data.title || values.url;
    } else {
      // Something went wrong
      toast.style = Toast.Style.Failure;
      toast.title = "Something went wrong while adding your link";
      toast.message = data.message || data.error || JSON.stringify(data);
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to add link";
    toast.message = error instanceof Error ? error.message : "Unknown error occurred";
  }
}
