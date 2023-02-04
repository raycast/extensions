import { Action, ActionPanel, Detail } from "@raycast/api";

interface Choice {
  text: string;
  index: number;
  logprobs: number;
  finish_reason: string;
}

interface Result {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<Choice>;
  usage?: any;
}

export default function ResultView({ result }: { result: Result }) {
  const choice: Choice = result.choices[0];

  return (
    <Detail
      navigationTitle="Response"
      markdown={choice.text}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy to Clipboard" content={choice.text} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Probability" text={Math.exp(choice.logprobs).toFixed(2)} />
          <Detail.Metadata.TagList title="Finish Reason">
            <Detail.Metadata.TagList.Item text={result.choices[0].finish_reason} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Model">
            <Detail.Metadata.TagList.Item text={result.model} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}
