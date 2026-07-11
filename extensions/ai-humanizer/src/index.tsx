import { Form, ActionPanel, Action, showToast, Icon, getPreferenceValues, Toast } from "@raycast/api";
import { useState } from "react";
import axios from "axios";

interface Values {
  originalText: string;
  model: string;
}

interface Preferences {
  apiKey: string;
}

export default function Command() {
  const [humanizedText, setHumanizedText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.apiKey;

  async function humanize(text: string, model: string): Promise<string | undefined> {
    try {
      const url = "https://v1-humanizer.rephrasy.ai/api";
      const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
      const data = {
        text: text,
        model: model,
      };

      const response = await axios.post(url, data, { headers });

      showToast({ title: "Text Humanized", message: "Text successfully humanized!" });

      console.log("API Response:", response.data);

      return response.data.output;
    } catch (error: unknown) {
      console.error("Error in humanize function:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to humanize text",
      });
    }
  }

  const handleSubmit = async (values: Values) => {
    if (!apiKey) {
      showToast({
        style: Toast.Style.Failure,
        title: "API Key Missing",
        message: "Please set your API key in the extension preferences.",
      });
      return;
    }

    setLoading(true);
    const result = await humanize(values.originalText, values.model);
    console.log("Humanized Text Result:", result);
    setHumanizedText(result || "");
    setLoading(false);
  };

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Humanize" icon={Icon.Wand} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea autoFocus={true} id="originalText" title="Original Text" />
      <Form.Dropdown id="model" title="Model" defaultValue="undetectable">
        <Form.Dropdown.Item value="undetectable" title="Undetectable" />
        <Form.Dropdown.Item value="SEO Model" title="SEO" />
      </Form.Dropdown>
      {humanizedText && (
        <>
          <Form.Separator />
          <Form.TextArea id="humanizedText" title="Humanized Text" value={humanizedText} />
        </>
      )}
    </Form>
  );
}
