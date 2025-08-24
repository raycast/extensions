import { Grid } from "@raycast/api";
import ResponseActions from "./actions/ResponseActions";
import { CommandOptions } from "../../lib/commands/types";
import { useSpeech } from "../../hooks/useSpeech";

export default function CommandGridView(props: {
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
    <Grid
      isLoading={isLoading}
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
    >
      {response
        .split("~~~")
        .filter((item) => {
          return item.match(/^[\S]*.*$/g) != undefined;
        })
        .map((item, index) => (
          <Grid.Item
            title={(item.split("$$$")[1] || item.replace("$$$", "")).trim()}
            key={`item${index}`}
            content={item.split("$$$")[0].trim()}
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
                listItem={item.trim()}
                speaking={speaking}
                // @ts-expect-error: To keep to original code
                stopSpeech={stopSpeech}
                restartSpeech={restartSpeech}
              />
            }
          />
        ))}
    </Grid>
  );
}
