import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";

import type { System } from "../types/system";
import { truncateText } from "../utils/truncate";
import { getSystemUrl } from "../utils/urls";
import type { ContainerInfoGuess } from "../utils/containers";
import { ContainerStatsView } from "./views/ContainerStatsView";
import { usePreferences } from "../hooks/use-preferences";

export interface ContainerListItem {
  id: string;
  info: ContainerInfoGuess;
  system: System;
}

export function ContainerListItem({ id, system, info }: ContainerListItem) {
  const preferences = usePreferences();

  return (
    <List.Item
      id={id}
      title={truncateText(id, 30)}
      subtitle={info.label}
      accessories={[
        info.keywords.length > 0 ? { tag: { value: info.keywords[0], color: info.color } } : undefined,
      ].filter((entry) => !!entry)}
      icon={{ source: info.icon, tintColor: Color.SecondaryText }}
      keywords={[id, ...info.keywords]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Stats"
            icon={Icon.LineChart}
            target={<ContainerStatsView containerId={id} system={system} />}
          />
          <Action.OpenInBrowser
            title="Open in Browser"
            shortcut={Keyboard.Shortcut.Common.Open}
            url={getSystemUrl(preferences.host, system)}
          />
        </ActionPanel>
      }
    />
  );
}
