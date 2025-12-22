import { ActionPanel, Action, Detail } from "@raycast/api";

interface ResponseViewProps {
  prompt: string;
  response: string;
  model: string;
}

export function ResponseView({ prompt, response, model }: ResponseViewProps) {
  const markdown = "# " + model + "\n\n## Prompt\n" + prompt + "\n\n## Response\n" + response;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={response} title="Copy Response" />
          <Action.CopyToClipboard content={markdown} title="Copy Full Conversation" />
        </ActionPanel>
      }
    />
  );
}
