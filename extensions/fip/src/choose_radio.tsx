import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { startRadio } from "./playback";
import { RADIOS } from "./radios";

export default function Command() {
  return (
    <List searchBarPlaceholder="Search radios">
      {RADIOS.map((radio) => (
        <List.Item
          key={radio.id}
          title={radio.title}
          actions={
            <ActionPanel>
              <Action title="Play" icon={Icon.Play} onAction={() => startRadio(radio)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
