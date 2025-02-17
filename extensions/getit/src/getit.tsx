import { Action, ActionPanel, Form, showToast, Toast, Icon, useNavigation, Detail } from "@raycast/api";
import { useForm, useFetch, FormValidation } from "@raycast/utils";

interface RequestValues {
  url: string;
  type: string;
  body?: string;
}

export default function Command() {
  const { push } = useNavigation(); // Enables navigation to new views
  const { handleSubmit, itemProps } = useForm<RequestValues>({
    onSubmit(values) {
      showToast({
        style: Toast.Style.Success,
        title: "Request Sent!",
        message: `Succefully sent a ${values.type} request to ${values.url}`,
      });

      // Navigate to the new page and display request details
      push(<RequestResult values={values} />);
    },
    validation: {
      url: (value) => {
        if (!value) return "URL is required.";
        try {
          new URL(value);
          return undefined;
        } catch {
          return "Please enter a valid URL.";
        }
      },
      type: FormValidation.Required,
    },
  });

  return (
    <Form
      searchBarAccessory={<Form.LinkAccessory target="https://github.com/tobikli/getit" text="Open Source Code" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="URL" placeholder="https://api.twks.net" {...itemProps.url} />

      <Form.Dropdown {...itemProps.type} title="Request Type">
        <Form.Dropdown.Item value="GET" title="GET" />
        <Form.Dropdown.Item value="POST" title="POST" />
        <Form.Dropdown.Item value="PUT" title="PUT" />
        <Form.Dropdown.Item value="DELETE" title="DELETE" />
      </Form.Dropdown>

      {(itemProps.type.value === "POST" || itemProps.type.value === "PUT") && (
        <Form.TextArea title="Request Body" placeholder="Enter JSON body" {...itemProps.body} />
      )}

      <Form.Separator />
      <Form.Description title="About" text="2025 - Tobias Klingenberg" />
    </Form>
  );
}

function RequestResult({ values }: { values: { url: string; type: string; body?: string } }) {
  const { isLoading, data, revalidate } = useFetch(values.url, {
    method: values.type,
    body: values.body ? JSON.stringify(values.body) : undefined,
    headers: { "Content-Type": "application/json" },
    parseResponse: async (response) => response.text(), // Ensure response is text
  });

  // Escape special markdown characters to avoid breaking the format
  const escapeMarkdown = (text: string) => text.replace(/`/g, "\\`").replace(/\*/g, "\\*").replace(/_/g, "\\_");

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# Request Sent!
      
**URL:** ${values.url}  
**Type:** ${values.type}  
${values.body ? `**Body:**\n\`\`\`json\n${values.body}\n\`\`\`` : ""}    
---

### Response:
\`\`\`
${data ? escapeMarkdown(data) : "No response yet"}
\`\`\` `}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Response"
            content={data ? escapeMarkdown(data) : "No response yet"}
            icon={Icon.Clipboard}
          />
          <Action title="Reload" onAction={() => revalidate()} icon={Icon.RotateAntiClockwise} />
        </ActionPanel>
      }
    />
  );
}
