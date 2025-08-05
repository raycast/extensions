import { Detail } from "@raycast/api";
import ResponseActions from "./actions/ResponseActions";
import { CommandOptions } from "../../lib/commands/types";
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

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${commandName}\n${response
        .replaceAll("<", "\\<")
        .replaceAll(/(?<!(```|\t..| {2}.))([\s\S]*?)\n$/gm, "$1\n\n$2")}`}
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
          // @ts-expect-error: To keep to original code
          stopSpeech={stopSpeech}
          restartSpeech={restartSpeech}
        />
      }
    />
  );
}
