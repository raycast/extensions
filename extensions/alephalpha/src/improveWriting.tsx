import { Detail, LaunchProps, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchStreamingApiResponse, StreamResponseEventEmitter } from "./util/apiHelper";
import { getPrompt } from "./util/promptLoader";
import { SummarizeArguments } from "./summarize";

export default function ImproveWritingCommand(props: LaunchProps<{ arguments: SummarizeArguments }>) {
  const { textInput } = props.arguments;
  const [improvedText, setImprovedText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [streamEmitter, setStreamEmitter] = useState<StreamResponseEventEmitter | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  // Set up streaming response
  useEffect(() => {
    if (!streamEmitter) {
      const emitter = new StreamResponseEventEmitter();
      setStreamEmitter(emitter);

      // Start streaming request
      fetchStreamingApiResponse(getPrompt("improveWriting"), textInput, preferences.defaultModel, emitter);

      // Set up listeners
      emitter.on("chunk", (chunk: string) => {
        setImprovedText((prev) => prev + chunk);
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
      markdown={improvedText}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={improvedText} />
        </ActionPanel>
      }
    />
  );
}
