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
  note: string;
}

interface Highlight {
  title: string;
  text: string;
  url?: string;
  note?: string;
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
        const url = values.reference;
        const note = values.note;
        console.log("Sending request with URL:", url);
        console.log("Sending request with Note:", note);
        const today = new Date().toISOString().slice(0, 10);
        const highlights: Highlight[] = [
          {
            title: today,
            text: content,
            note: note,
          },
        ];

        const response = await fetch(READWISE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${apiKey}`,
          },
          body: JSON.stringify({ highlights }),
        });

        console.log("Received response from Readwise API:", response.status, response.statusText);

        if (response.ok) {
          console.log("Sent URL:", url);
          showToast(Toast.Style.Success, "Successfully sent to Readwise!");
        } else {
          const responseBody = await response.text();
          console.error(
            `${responseBody} -> Request failed, status code: ${response.status}, response body: ${responseBody}`
          );
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
      <Form.TextArea
        title="Highlight"
        {...itemProps.content}
        id="content"
        placeholder="(Required) Write down your fleeting notes…"
        info="🪄 Small tips! If you are reading documents on a computer, then I think using the Readwise Chrome extension is a better choice.
⚡️ However, if you aim to record your sudden enlightenments, then using this Raycast plugin might be a better way!
📝 Your notes will be saved under a Readwise book named after today's date. For example: 2023-09-20."
      />
      <Form.TextArea
        title="Reference"
        {...itemProps.reference}
        id="reference"
        placeholder="(Optional) urls"
        info="✨ Use a comma (either in Chinese or English) or a new line to separate multiple links.
☝️ If you have also set up to export from Readwise to note-taking software like Heptabase, Notion, etc., they can be normally rendered as hyperlinks in such note-taking software."
      />
      <Form.TextArea
        title="Comment"
        {...itemProps.note}
        id="note"
        placeholder="(Optional) Tags or comments…"
        info="1⃣️ Add a comment to the highlight. If the Highlight is identical, the comment sent later will completely overwrite the comment sent earlier.
2⃣️ Inline tagging is supported, for usage methods please refer to https://blog.readwise.io/tag-your-highlights-while-you-read/.
3⃣️ If you have triggered the first one, the tags already applied to the highlight through inline tagging will not be overwritten in Readwise."
      />
    </Form>
  );
}
