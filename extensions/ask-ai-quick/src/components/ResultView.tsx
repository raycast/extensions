import { Action, ActionPanel, Detail } from "@raycast/api";
import { AgentFormValues } from "../lib/hooks";
import * as util from "../util";

interface ResultViewProps {
  agent: AgentFormValues;
  user_input: string;
  response: string;
  isLoading: boolean;
}

export default function ResultView({ agent, user_input, response, isLoading }: ResultViewProps) {
  const prompt_token_count = util.countToken(agent.prompt + user_input);
  const response_token_count = util.countToken(response);
  const total_price = util.useEstimatedPrice(prompt_token_count, response_token_count);

  return (
    <Detail
      markdown={response}
      isLoading={isLoading}
      actions={
        !isLoading && (
          <ActionPanel title="Actions">
            <Action.CopyToClipboard title="Copy Results" content={response} />
            <Action.Paste title="Paste Results" content={response} />
          </ActionPanel>
        )
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Current Model" text={agent.model} />
          <Detail.Metadata.Label title="Prompt Tokens" text={prompt_token_count.toString()} />
          <Detail.Metadata.Label title="Response Tokens" text={response_token_count.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Total Tokens" text={(prompt_token_count + response_token_count).toString()} />
          <Detail.Metadata.Label title="Total Cost" text={total_price} />
        </Detail.Metadata>
      }
    />
  );
}
