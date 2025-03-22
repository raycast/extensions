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
import { showFailureToast } from "@raycast/utils";
import { useHistory } from "./history";
import { getFormattedColor, getIcon, getPreviewColor, getShortcut } from "./utils";

export default function Command() {
  const { history, remove, clear } = useHistory();

  return (
    <MenuBarExtra icon={Icon.EyeDropper}>
      <MenuBarExtra.Item
        title="Pick Color"
        onAction={async () => {
          try {
            await launchCommand({
              name: "pick-color",
              type: LaunchType.Background,
              context: { source: "menu-bar" },
            });
          } catch (e) {
            await showFailureToast(e);
          }
        }}
      />
      <MenuBarExtra.Section>
        {history?.slice(0, 9).map((historyItem, index) => {
          const formattedColor = getFormattedColor(historyItem.color);
          const previewColor = getPreviewColor(historyItem.color);
          return (
            <MenuBarExtra.Item
              key={formattedColor}
              icon={getIcon(previewColor)}
              title={formattedColor}
              subtitle={historyItem.title}
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
