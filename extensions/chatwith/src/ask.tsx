import { Detail, LaunchProps, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
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
  } = useFetch(`https://api.chatwith.tools/v1/chatbot/${preferences.chatbotId}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": `application/json`,
      Authorization: `Bearer ${preferences.apiKey}`,
    },
    body: JSON.stringify({
      message: question,
      stream: false,
    }),
    keepPreviousData: false,
    initialData: "",
    parseResponse: async (response) => {
      const responseText = await response.text();
      setMarkdown(responseText);
    },
    onWillExecute: () => {
      showToast(Toast.Style.Animated, "Thinking...");
    },
    onData: () => {
      showToast(Toast.Style.Success, "Done!");
    },
    onError: (error) => {
      showToast(Toast.Style.Failure, "Failed to answer question", error.message);
    },
  });

  return <Detail isLoading={isLoading} markdown={markdown} />;
}
