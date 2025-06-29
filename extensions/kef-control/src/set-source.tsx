import { ActionPanel, Action, Icon, List, showHUD } from "@raycast/api";
import setSource, { type Source } from "./tools/set-source";

const SOURCES: { icon: Icon; name: Source }[] = [
  {
    name: "wifi",
    icon: Icon.Wifi,
  },
  {
    name: "bluetooth",
    icon: Icon.Bluetooth,
  },
  {
    name: "tv",
    icon: Icon.Video,
  },
  {
    name: "optical",
    icon: Icon.Eye,
  },
  {
    name: "usb",
    icon: Icon.Desktop,
  },
  {
    name: "aux",
    icon: Icon.Speaker,
  },
];

export default function Command() {
  return (
    <List>
      {SOURCES.map((source) => (
        <List.Item
          key={source.name}
          icon={source.icon}
          title={source.name}
          actions={
            <ActionPanel>
              <Action
                title="Set Source"
                onAction={async () => {
                  await setSource(source.name);
                  showHUD(`Source set to ${source.name}`);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
