import { Detail, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { getMarkdown, getRandomObliqueStrategy } from "./oblique";
import { DisplayMode, ObliqueStrategy } from "./types";

export default function Command({ launchContext }: { launchContext: { strategy?: ObliqueStrategy } }) {
  const preferences = getPreferenceValues<Preferences>();
  const [obliqueStrategy, setObliqueStrategy] = useState(launchContext?.strategy || getRandomObliqueStrategy());

  return (
    <Detail
      markdown={getMarkdown(obliqueStrategy.strategy, preferences.displayMode as DisplayMode, preferences.italicise)}
      navigationTitle="Oblique Strategies"
      actions={
        <ActionPanel>
          <Action
            title="New Strategy"
            icon={Icon.Shuffle}
            onAction={() => setObliqueStrategy(getRandomObliqueStrategy())}
          />
          <Action.CopyToClipboard content={obliqueStrategy.strategy} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <Action.Paste content={obliqueStrategy.strategy} shortcut={{ modifiers: ["cmd"], key: "v" }} />
        </ActionPanel>
      }
    />
  );
}
