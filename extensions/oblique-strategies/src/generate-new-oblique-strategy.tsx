import { Action, ActionPanel, Detail, Icon, getPreferenceValues, popToRoot } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { useState } from "react";
import { getMarkdown } from "./oblique";
import { DisplayMode } from "./types";

const OBLIQUE_PROMPT = `Create a new oblique strategy in the vain of Brian Eno and Peter Schmidt. 
Only reply with the short suggestion, nothing else, no quotation marks. Do not start with embrace. 
Avoid the following strategies or similar versions of them: `;

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [previousResults, setPreviousResults] = useState<string[]>([]);
  const { data, isLoading } = useAI(OBLIQUE_PROMPT + previousResults.join(", "), {
    stream: true,
    onError: (err) => {
      if (err.message === "Process cancelled") {
        popToRoot();
        return;
      }
    },
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={isLoading ? "" : getMarkdown(data, preferences.displayMode as DisplayMode, preferences.italicise)}
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
