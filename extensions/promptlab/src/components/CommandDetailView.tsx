import { Detail } from "@raycast/api";
import ResponseActions from "../ResponseActions";
import { CommandOptions } from "../utils/types";

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

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${commandName}\n${response}`}
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
        />
      }
    />
  );
}
