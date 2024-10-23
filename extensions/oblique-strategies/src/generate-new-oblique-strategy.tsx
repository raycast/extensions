import { AI, Action, ActionPanel, Detail, Icon, environment, getPreferenceValues } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { useState } from "react";
import { getMarkdown } from "./oblique";
import { DisplayMode } from "./types";

const OBLIQUE_PROMPT = `Create a new oblique strategy in the vain of Brian Eno and Peter Schmidt. 
Only reply with the short suggestion, nothing else, no quotation marks. Do not start with embrace. 
Avoid the following strategies or similar versions of them: `;

const MISSING_AI_ACCESS = "You don't have AI access :(";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [previousResults, setPreviousResults] = useState<string[]>([]);
  const { data, isLoading } = useAI(OBLIQUE_PROMPT + previousResults.join(", "), {
    execute: environment.canAccess(AI),
    stream: true,
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        environment.canAccess(AI)
          ? getMarkdown(data, preferences.displayMode as DisplayMode, preferences.italicise)
          : MISSING_AI_ACCESS
      }
      actions={
        <ActionPanel>
          <Action
            title="New Strategy"
            icon={Icon.Shuffle}
            onAction={() => {
              setPreviousResults((previous) => [...previous, data]);
              console.log(previousResults);
            }}
          />

          <Action.CopyToClipboard content={data} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <Action.Paste content={data} shortcut={{ modifiers: ["cmd"], key: "v" }} />
        </ActionPanel>
      }
    />
  );
}
