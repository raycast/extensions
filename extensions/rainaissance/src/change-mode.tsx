import { Action, ActionPanel, closeMainWindow, Icon, List, open } from "@raycast/api";

enum Mode {
  Falling = "falling",
  Snow = "snow",
  Dripping = "dripping",
}

export default function Command() {
  return (
    <List>
      {Object.values(Mode).map((mode) => (
        <List.Item
          key={mode}
          title={toTitleCase(mode)}
          icon={getIcon(mode)}
          actions={
            <ActionPanel>
              <Action
                title="Change Mode"
                onAction={async () => {
                  await open(`rainaissance://change-mode?mode=${mode}`);
                  await closeMainWindow();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function getIcon(mode: Mode) {
  switch (mode) {
    case Mode.Snow:
      return Icon.Snowflake;
    case Mode.Dripping:
      return Icon.Raindrop;
    case Mode.Falling:
      return Icon.CloudRain;
    default:
      return Icon.CloudRain;
  }
}

function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
