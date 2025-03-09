import { Form, ActionPanel, Action, showToast, Clipboard } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";

type PasteResponse = {
  content: string;
  id: string;
  is_url: boolean;
};

export default function Command() {
  const [content, setContent] = useState("");

  const { data, isLoading, revalidate } = useFetch<PasteResponse>("https://katb.in/api/paste", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paste: { content } }),
    execute: false,
  });

  function handleSubmit(values: { content: string }) {
    setContent(values.content);
  }

  useEffect(() => {
    if (content) {
      revalidate();
    }
  }, [content]);

  useEffect(() => {
    if (data?.id) {
      const pasteUrl = `https://katb.in/${data.id}`;
      const copyToClipboard = async () => {
        try {
          await Clipboard.copy(pasteUrl);
          showToast({ title: "Paste created!", message: pasteUrl });
        } catch (error) {
          showFailureToast({ title: "Failed to copy to clipboard" });
        }
        setContent("");
      };

      copyToClipboard();
    }
  }, [data]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Paste the text you want to save in Katbin" />
      <Form.TextArea id="content" title="Content" placeholder="Enter your text here" />
    </Form>
  );
}
