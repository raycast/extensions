import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { useState } from "react";
import { useTranscribe } from "./hooks/useTranscribe";

export default function Command() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useAI(query || "Hi, I'm Visor. Ask me anything by clicking the record button!");
  const { isRecording, isTranscribing, startRecording, stopRecording } = useTranscribe();

  const handleRecording = async () => {
    try {
      if (isRecording) {
        console.log("Stopping recording...");
        const transcription = await stopRecording();
        console.log("Got transcription:", transcription);
        setQuery(transcription);
      } else {
        console.log("Starting recording...");
        await startRecording();
      }
    } catch (error) {
      console.error("Recording handler error:", error);
    }
  };

  return (
    <Detail
      isLoading={isLoading || isTranscribing}
      markdown={data}
      actions={
        <ActionPanel>
          <Action
            title={isRecording ? "Stop Recording" : "Record Question"}
            icon={isRecording ? Icon.Stop : Icon.Microphone}
            onAction={handleRecording}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
