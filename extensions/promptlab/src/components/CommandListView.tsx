import { List } from "@raycast/api";
import ResponseActions from "../ResponseActions";
import { CommandOptions } from "../utils/types";

export default function CommandListView(props: {
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
    <List
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
        />
      }
    >
      {response
        .split("~~~")
        .filter((item) => {
          return item.match(/^[\S]*.*$/g) != undefined;
        })
        .map((item, index) => (
          <List.Item
            title={item.trim()}
            key={`item${index}`}
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
              />
            }
          />
        ))}
    </List>
  );
}
