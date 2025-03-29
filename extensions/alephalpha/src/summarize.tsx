import { Detail, LaunchProps, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchStreamingApiResponse, StreamResponseEventEmitter } from "./util/apiHelper";
import { getPrompt } from "./util/promptLoader";

// Define the Arguments interface
export interface SummarizeArguments {
  textInput: string;
}

export default function SummarizeCommand(props: LaunchProps<{ arguments: SummarizeArguments }>) {
  const { textInput } = props.arguments;
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [streamEmitter, setStreamEmitter] = useState<StreamResponseEventEmitter | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  // Set up streaming response
  useEffect(() => {
    if (!streamEmitter) {
      const emitter = new StreamResponseEventEmitter();
      setStreamEmitter(emitter);

      // Start streaming request
      fetchStreamingApiResponse(getPrompt("summarize"), textInput, preferences.defaultModel, emitter);

      // Set up listeners
      emitter.on("chunk", (chunk: string) => {
        setSummary((prev) => prev + chunk);
      });

      emitter.on("error", () => {
        setIsLoading(false);
      });

      emitter.on("done", () => {
        setIsLoading(false);
      });

      // Cleanup listeners on unmount
      return () => {
        emitter.removeAllListeners();
      };
    }
  }, [textInput, preferences.defaultModel]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={summary}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={summary} />
        </ActionPanel>
      }
    />
  );
}
