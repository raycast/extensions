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

import fetch from "node-fetch";
globalThis.fetch = fetch;

import Bard, { askAI } from "bard-ai";

export default function ResultView(prompt, toast_title, type = "text", title, optionalSelect) {
  if (type === "text") {
    prompt +=
      " Return your response as a JSON with key 'response', and key 'explanation'. The value associated with 'response' should be a single string with your answer. The value associated with 'explanation' should be a string describing what you did. Be sure to be elaborate with your explanation, giving specific examples of what you did. If you did nothing, then simply say that. ONLY return that JSON and nothing else. Be accurate and concise. \n\n";
  }
  if (type === "code") {
    prompt +=
      " Return your response in a codeblock. DO NOT ADD ANY EXTRA CODE UNLESS TOLD TO. \n\n Then add a JSON IN A SEPERATE CODEBLOCK at the end with ONE key, 'explanation'. The value associated with 'explanation' should be a string describing the code you have written, what you have changed, or WHY you wrote what you wrote. \n\n";
  }
  const pref = getPreferenceValues();
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [pasteContent, setPasteContent] = useState("");
  const [failed, setFailed] = useState(false);

  async function getResult() {
    const now = new Date();
    const toast = await showToast(Toast.Style.Animated, toast_title);
    async function getBardResponse() {
      let selectedText = "";

      try {
        selectedText = await getSelectedText();
        if (!prompt) {
          prompt = selectedText;
        } else if (optionalSelect) {
          selectedText = "\n\n" + selectedText;
        }
      } catch (error) {
        if (!prompt) {
          toast.title = "Error";
          toast.style = Toast.Style.Failure;
          setLoading(false);
          setResponse("⚠️ No input was provided.");
          setFailed(true);
          return;
        }
        if (!optionalSelect) {
          toast.title = "Error";
          toast.style = Toast.Style.Failure;
          setLoading(false);
          setResponse("⚠️ Raycast was unable to get the selected text.");
          setFailed(true);
          return;
        }
      }

      try {
        await Bard.init(pref["__Secure-1PSID"]);
        return await askAI(`${prompt}${selectedText}`);
      } catch (error) {
        toast.title = "Error";
        toast.style = Toast.Style.Failure;
        setLoading(false);
        setResponse("⚠️ Unable to reach Bard at this time.");
        setFailed(true);
        return;
      }
    }

    getBardResponse().then((response) => {
      if (!response) return;
      if (type === "text") {
        let match = response.match(/"response": "([^"]*)"/);
        let explain = response.match(/"explanation": "([^"]*)"/);
        if (match[1]) {
          setResponse("## AI Response:\n" + match[1].trim() + "\n\n\n ## Explanation: \n" + explain[1].trim());
        } else {
          setResponse(response);
        }

        setPasteContent(match[1].trim());
      } else if (type === "code") {
        let wholeCode = response.match(/(```[a-zA-Z]+?.*?```)/s);
        let match = response.match(/```([a-zA-Z]+)?(.*?)```/s);
        let explain = response.match(/"explanation": "([^"]*)"/);
        if (match) {
          setResponse("## AI Code Response:\n" + wholeCode[0].trim() + "\n\n\n ## Explanation: \n" + explain[1].trim());
        } else {
          setResponse(response);
        }
        setPasteContent(match[2].trim());
      } else if (type === "general") {
        setResponse(response);
        setPasteContent(response);
      } else {
        setResponse(response);
        setPasteContent(response);
      }

      setLoading(false);
      toast.style = Toast.Style.Success;
      const duration = (new Date().getTime() - now.getTime()) / 1000;
      toast.title = `Finished in ${duration} seconds`;
    });
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
          <Detail.Metadata.Label title="Command Type" text={type.charAt(0).toUpperCase() + type.slice(1)} />
          <Detail.Metadata.Label title="Command Title" text={title} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Model" text={`PaLM 2`} />
          <Detail.Metadata.Label title="Version" text="2023.07.13" />
        </Detail.Metadata>
      }
    />
  );
}
