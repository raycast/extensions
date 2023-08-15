import "isomorphic-fetch";
import { getSelectedText, Detail, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { BingChat } from "bing-chat";
import { configuration } from "./api";

export default function ResultView(prompt: string, toastTitle: string) {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(0);

  async function getResult() {
    const now = new Date();
    const toast = await showToast(Toast.Style.Animated, toastTitle);

    async function getStream(prompt: string) {
      let text = "";
      try {
        text = await getSelectedText();
      } catch (error: any) {
        toast.title = "Error";
        toast.style = Toast.Style.Failure;
        setLoading(false);
        setResponse(
          `⚠️ Raycast was unable to get the selected text. You may try copying the text to a text editor and try again. Error: ${error.message}`
        );
        return;
      }

      try {
        const api = new BingChat({
          cookie: configuration.bingCookies,
        });

        await api.sendMessage(`${prompt}${text}`, {
          onProgress: (partialResponse) => {
            setResponse(partialResponse.text);
          },
          variant: configuration.conversationStyle,
        });
        setLoading(false);
        const done = new Date();
        setDuration((done.getTime() - now.getTime()) / 1000);
        toast.style = Toast.Style.Success;
        toast.title = "Finished";
      } catch (error) {
        toast.title = "Error";
        toast.style = Toast.Style.Failure;
        setLoading(false);
        setResponse(
          `⚠️ Failed to get response from Bing. Please check your network connection and your cookie. \n\n Error Message: \`\`\`${
            (error as Error).message
          }\`\`\``
        );
        return;
      }
    }

    getStream(prompt);
  }

  async function retry() {
    setLoading(true);
    setResponse("");
    getResult();
  }

  useEffect(() => {
    getResult();
  }, []);

  return (
    <Detail
      markdown={response}
      isLoading={loading}
      actions={
        !loading && (
          <ActionPanel title="Actions">
            <Action.CopyToClipboard title="Copy Results" content={response} />
            <Action.Paste title="Paste Results" content={response} />
            <Action title="Retry" onAction={retry} shortcut={{ modifiers: ["cmd"], key: "r" }} icon={Icon.Repeat} />
          </ActionPanel>
        )
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Action" text={toastTitle} />
          <Detail.Metadata.Label title="Bing Mode" text={configuration.conversationStyle} />
          {!loading && <Detail.Metadata.Label title="Query Time" text={String(duration) + " seconds"} />}
        </Detail.Metadata>
      }
    />
  );
}
