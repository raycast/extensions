import {
  Form,
  ActionPanel,
  Action,
  showToast,
  open,
  Toast,
  LocalStorage,
} from "@raycast/api";
import { useEffect, useState } from "react";

interface URL {
  id: string;
  url: string;
}

export default function Command() {
  const [urls, setUrls] = useState<URL[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUrls();
  }, []);

  async function loadUrls() {
    try {
      const storedUrls = await LocalStorage.getItem<string>("urls");
      if (storedUrls) {
        setUrls(JSON.parse(storedUrls));
      }
    } catch (error) {
      console.error("Error loading URLs:", error);
    }
    setIsLoading(false);
  }

  async function handleSubmit(values: { prompt: string }) {
    if (urls.length === 0) {
      showToast({
        title: "No URLs configured",
        message: "Use 'Add Multi URLs' command to add URLs first",
        style: Toast.Style.Failure,
      });
      return;
    }

    try {
      const encodedPrompt = encodeURIComponent(values.prompt);
      let openCount = 0;

      for (const { url: baseUrl } of urls) {
        if (!baseUrl.trim()) continue;

        const url = baseUrl.includes("?q=")
          ? baseUrl + encodedPrompt
          : `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}q=${encodedPrompt}`;
        await open(url);
        openCount++;
      }

      showToast({
        title: `Opened ${openCount} URL${openCount !== 1 ? "s" : ""}`,
        style: Toast.Style.Success,
      });
    } catch (error) {
      showToast({
        title: "Error opening URLs",
        message: String(error),
        style: Toast.Style.Failure,
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={handleSubmit}
            title={`Open ${urls.length} Links`}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder={`Enter the prompt to use across ${urls.length} URLs...`}
      />
    </Form>
  );
}
