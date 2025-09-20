import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import React, { useState } from "react";
import { useCost } from "../hooks";
import { getModelName } from "../lib/OpenAI";
import { History } from "../types";

interface Props {
  history: History;
}

export default function HistoryDetails({ history }: Props) {
  const [displayPrompt, setDisplayPrompt] = useState<boolean>(false);

  const cost = useCost(history.action.model, history.tokens.input, history.tokens.output);

  return (
    <Detail
      markdown={displayPrompt ? `# Prompt\n\n---\n${history.prompt}` : `# Result\n\n---\n${history.result}`}
      navigationTitle={history.prompt.trim()}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Action" text={history.action.name} />
          <Detail.Metadata.Label title="Timestamp" text={new Date(history.timestamp).toLocaleString()} />
          <Detail.Metadata.Label title="System Prompt" text={history.action.systemPrompt} />
          <Detail.Metadata.Label title="Temperature" text={history.action.temperature.toString()} />
          <Detail.Metadata.Label title="Max Tokens" text={history.action.maxTokens.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Model">
            <Detail.Metadata.TagList.Item text={getModelName(history.action.model)} color={Color.SecondaryText} />
          </Detail.Metadata.TagList>
          <React.Fragment>
            <Detail.Metadata.Label title="Input Tokens" text={history.tokens.input.toString()} />
            <Detail.Metadata.Label title="Output Tokens" text={history.tokens.output.toString()} />
            <Detail.Metadata.Label title="Total Tokens" text={history.tokens.total.toString()} />
            <Detail.Metadata.Label title="Cost" text={`$${cost.toFixed(6)}`} />
          </React.Fragment>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={history.result} />
          {displayPrompt ? (
            <Action
              title="Show Result"
              onAction={() => setDisplayPrompt(false)}
              icon={Icon.Repeat}
              shortcut={{
                modifiers: ["cmd"],
                key: "return",
              }}
            />
          ) : (
            <Action
              title="Show Prompt"
              onAction={() => setDisplayPrompt(true)}
              icon={Icon.Repeat}
              shortcut={{
                modifiers: ["cmd"],
                key: "return",
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
