import { ActionPanel, Form, showToast, Toast, Action, getPreferenceValues } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import fetch from "node-fetch";

const READWISE_API_URL = "https://readwise.io/api/v2/highlights/";

interface Preferences {
  apiKey: string;
}

interface ReadwiseFormValues {
  content: string;
  reference: string;
}

interface Highlight {
  title: string;
  text: string;
  url?: string;
}

export default function Command() {
  const { handleSubmit, itemProps, values } = useForm<ReadwiseFormValues>({
    onSubmit: async (values) => {
      const preferences: Preferences = getPreferenceValues();
      const apiKey = preferences.apiKey;
      function formatReferences(references: string): string {
        if (!references) {
          return "";
        }
        const refs = references
          .split(/,|，|\n/)
          .map((ref) => ref.trim())
          .filter(Boolean);
        let formattedRefs = "\n**References**\n";
        refs.forEach((ref, index) => {
          formattedRefs += `- [[${index + 1}] ](${ref})`;
          if (index !== refs.length - 1) {
            formattedRefs += "\n";
          }
        });
        return formattedRefs;
      }
      const references = formatReferences(values.reference);
      let content = values.content;
      if (references) {
        content += `\n${references}`;
      }

      try {
        const url = values.reference
        console.log('Sending request with URL:', url);
        const today = new Date().toISOString().slice(0, 10);
        const highlights: Highlight[] = [{
          title: today,
          text: content,
        }];
        
        const response = await fetch(READWISE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${apiKey}`
          },
          body: JSON.stringify({ highlights }),
        });
      
        console.log('Received response from Readwise API:', response.status, response.statusText);    
      
        if (response.ok) {
          console.log('Sent URL:', url);
          showToast(Toast.Style.Success, "Successfully sent to Readwise!");
        } else {
          const responseBody = await response.text();
          console.error(`${responseBody} -> Request failed, status code: ${response.status}, response body: ${responseBody}`);
          console.log(`API Key: ${apiKey}`);
          console.log(`Failed URL: ${url}`);
          showToast(Toast.Style.Failure, "Sending failed, please check the API_KEY in Raycast settings.");
        }
      } catch (error) {
        console.error(error);
        showToast(Toast.Style.Failure, "Sending failed, please check the API_KEY in Raycast settings.");
      }
    },

    validation: {
      content: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Send to Readwise"
      actions={
        <ActionPanel>
          <Action title="Sends" onAction={() => handleSubmit(values)} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Note" {...itemProps.content} id="content" placeholder="Write down here…" />
      <Form.TextArea
        title="Reference"
        {...itemProps.reference}
        id="reference"
        placeholder="urls"
        info="Use a comma (either in Chinese or English) or a new line to separate multiple links. ⚠️ Please note, links must start with http or https to be rendered as hyperlinks in Readwise, otherwise they will be in markdown format. ☝️ If you have also set up to import from Readwise to note-taking software like Heptabase, Notion, etc., they can be normally rendered as hyperlinks in such note-taking software without starting with http or https."
      />
    </Form>
  );
}
