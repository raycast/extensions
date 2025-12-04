import { Action, ActionPanel, Detail } from "@raycast/api";
import { useAskVaib } from "../hooks/useAskVaib";

export default function Answer(props: { question: string }) {
  const { data, isLoading } = useAskVaib(props.question);

  return (
    <Detail
      isLoading={isLoading}
      markdown={data as string}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy to Clipboard"
            content={data as string}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Question" text={props.question ?? ""} />
        </Detail.Metadata>
      }
    />
  );
}
