import {
  getSelectedText,
  Detail,
  getPreferenceValues,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useEffect, useState } from "react";
import Bard, { askAI } from "bard-ai"

export default function ResultView(prompt, toast_title, type = "text", title) {
  if (type === "text") {
    prompt += " Return your response as a JSON with key 'response'. The value associated should be a single string with your answer. ONLY return that JSON and nothing else. Be accurate and concise. \n\n"
  }
  if (type === "code") {
    prompt += " Return your response in a codeblock. \n\n"
  }
  const pref = getPreferenceValues();
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [pasteContent, setPasteContent] = useState("")
  async function getResult() {
    const now = new Date();
    const toast = await showToast(Toast.Style.Animated, toast_title);
    async function getBardResponse() {
      let selectedText = "";

      try {
        selectedText = await getSelectedText();
      } catch (error) {
        toast.title = "Error"
        toast.style = Toast.Style.Failure;
        setLoading(false);
        setResponse("⚠️ Raycast was unable to get the selected text.");
        return;
      }

      try {
        await Bard.init(pref['__Secure-1PSID'])
        return await askAI(`${prompt}; ${selectedText}}`)
      } catch (error) {
        toast.title = "Error"
        toast.style = Toast.Style.Failure;
        setLoading(false);
        setResponse("⚠️ Unable to reach Bard at this time.");
        return;
      }
    }

    getBardResponse().then((response) => {
      if (!response) return;
      if (type === "text") {
        let match = response.match(/"response": "([^"]*)"/)
        if (match) {
          setResponse(match[1].trim());
        } else {
          setResponse(response);
        }
      } else if (type === "code") {
        let match = response.match(/```([a-zA-Z]+)?(.*?)```/s)
        if (match) {
          setResponse(match[0].trim());
        } else {
          setResponse(response);
        }
        setPasteContent(match[2].trim());
      } else {
        setResponse(response);
      }

      setLoading(false);
      toast.style = Toast.Style.Success
      const duration = ((new Date()).getTime() - now.getTime()) / 1000
      toast.title = `Finished in ${duration} seconds`
    })
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
            <Action.CopyToClipboard title="Copy Results" content={pasteContent} />
            <Action.Paste title="Paste Results" content={pasteContent} />
            <Action title="Retry" onAction={retry} shortcut={{ modifiers: ["cmd"], key: "r" }} icon={Icon.Repeat} />
          </ActionPanel>
        )
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Command Type" text={type.charAt(0).toUpperCase()
            + type.slice(1)} />
          <Detail.Metadata.Label title="Command Title" text={title} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Model" text={`PaLM 2`} />
          <Detail.Metadata.Label title="Version" text="2023.05.15" />
        </Detail.Metadata>
      }
    />
  );
}
