import { Clipboard, environment, Icon, MenuBarExtra, openCommandPreferences, showHUD } from "@raycast/api";
import { useHistory } from "./history";
import { getFormattedColor, getIcon, getShortcut, pickColor } from "./utils";

export default function Command() {
  const { history, add, remove, clear } = useHistory();

  return (
    <MenuBarExtra icon={Icon.EyeDropper}>
      <MenuBarExtra.Item
        title="Pick Color"
        onAction={async () => {
          try {
            const pickedColor = await pickColor();
            if (!pickedColor) {
              return;
            }

            add(pickedColor);

            const formattedColor = getFormattedColor(pickedColor);
            await Clipboard.copy(formattedColor);

            await showHUD("Copied color to clipboard");
          } catch (e) {
            console.error(e);

            await showHUD("❌ Failed picking color");
          }
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
        {environment.isDevelopment && <MenuBarExtra.Item title="Clear Cached State" onAction={() => clear()} />}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
