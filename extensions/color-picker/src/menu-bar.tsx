import {
  Clipboard,
  environment,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { useHistory } from "./history";
import { getFormattedColor, getIcon, getShortcut } from "./utils";

export default function Command() {
  const { history, remove, clear } = useHistory();

  return (
    <MenuBarExtra icon={Icon.EyeDropper}>
      <MenuBarExtra.Item
        title="Pick Color"
        onAction={() => {
          launchCommand({
            name: "pick-color",
            type: LaunchType.Background,
            context: { source: "menu-bar" },
          });
        }}
      />
      <MenuBarExtra.Section>
        {history?.slice(0, 9).map((historyItem, index) => {
          const formattedColor = getFormattedColor(historyItem.color);
          return (
            <MenuBarExtra.Item
              key={formattedColor}
              icon={getIcon(historyItem.color)}
              title={formattedColor}
              shortcut={getShortcut(index)}
              onAction={async (event) => {
                if (event.type === "left-click") {
                  await Clipboard.copy(formattedColor);
                  await showHUD("Copied color to clipboard");
                } else {
                  remove(historyItem.color);
                  await showHUD("Deleted color from history");
                }
              }}
            />
          );
        })}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Command"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
        {environment.isDevelopment && <MenuBarExtra.Item title="Clear All Colors" onAction={() => clear()} />}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
