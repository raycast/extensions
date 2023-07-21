import { Detail } from "@raycast/api";
import ResponseActions from "./actions/ResponseActions";
import { CommandOptions } from "../../utils/types";
import { useSpeech } from "../../hooks/useSpeech";

export default function CommandDetailView(props: {
  isLoading: boolean;
  commandName: string;
  options: CommandOptions;
  prompt: string;
  response: string;
  revalidate: () => void;
  cancel: () => void;
  selectedFiles: string[] | undefined;
}) {
  const { isLoading, commandName, options, prompt, response, revalidate, cancel, selectedFiles } = props;
  const { speaking, stopSpeech, restartSpeech } = useSpeech(options, isLoading, response);

  const lines = [];
  const parsedResponse = response.replaceAll("<", "\\<").split("\n");
  let inCodeBlock = false;
  for (const line of parsedResponse) {
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
    }

    if (!inCodeBlock) {
      lines.push(line + "\n");
    } else {
      lines.push(line);
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${commandName}\n${lines.join("\n")}`}
      navigationTitle={commandName}
      actions={
        <ResponseActions
          commandName={commandName}
          options={options}
          commandSummary="Response"
          responseText={response}
          promptText={prompt}
          reattempt={revalidate}
          cancel={cancel}
          files={selectedFiles}
          speaking={speaking}
          stopSpeech={stopSpeech}
          restartSpeech={restartSpeech}
        />
      }
    />
  );
}
