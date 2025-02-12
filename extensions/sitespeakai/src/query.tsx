import { Detail, LaunchProps, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { QueryResponse } from "./types";
import { getPreferenceValues } from "@raycast/api";
import { useState } from "react";

export default function Query(props: LaunchProps<{ arguments: { question: string } }>) {
  const { question } = props.arguments;
  return <QueryContent question={question} />;
}

function QueryContent({ question }: { question: string }) {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const [markdown, setMarkdown] = useState<string>("");
  const {
    isLoading,
  }: {
    isLoading: boolean;
  } = useFetch(`https://api.sitespeak.ai/v1/${preferences.chabotId}/query`, {
    method: "POST",
    headers: {
      "Content-Type": `application/json`,
      Authorization: `Bearer ${preferences.apiToken}`,
    },
    body: JSON.stringify({
      prompt: question,
      conversation_id: preferences.visitorId,
    }),
    keepPreviousData: false,
    initialData: "",
    parseResponse: async (response) => {
      const json = (await response.json()) as QueryResponse;

      setMarkdown(`${json.text || ""}  
      **Sources:**  
      ${json.urls
        ?.map(
          (url) => `[${url}](${url})  
      `,
        )
        .join(" ")}`);
    },
    onWillExecute: () => {
      showToast(Toast.Style.Animated, "Thinking...");
    },
    onData: () => {
      showToast(Toast.Style.Success, "Done!");
    },
    onError: (error) => {
      showToast(Toast.Style.Failure, "Failed to answer query", error.message);
    },
  });

  return <Detail isLoading={isLoading} markdown={markdown} />;
}
