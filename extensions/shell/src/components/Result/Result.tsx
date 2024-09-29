import { Action, ActionPanel, Detail } from "@raycast/api";
import { type FC, useState } from "react";
import { useRunCommand } from "./hooks/useRunCommand";

interface Props {
  command: string;
}

export const Result: FC<Props> = ({ command }) => {
  const [output, setOutput] = useState<string>("");
  const [finished, setFinished] = useState<boolean>(false);

  useRunCommand(command, setOutput, setFinished);

  const markdown = `
  $ ${command}
  ${output}
  `;

  return (
    <Detail
      markdown={markdown}
      isLoading={!finished}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={output} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        </ActionPanel>
      }
    />
  );
};
