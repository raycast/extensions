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
import { useHistory } from "./lib/history";
import { HistoryItem } from "./lib/types";
import { getFormattedColor, getIcon, getPreviewColor, getShortcut } from "./lib/utils";

export default function Command() {
  const { history, remove, clear } = useHistory();
  const favorites = history?.filter((item) => item.isFavorite) ?? [];
  const recentColors = history?.filter((item) => !item.isFavorite) ?? [];

  return (
    <MenuBarExtra icon={Icon.EyeDropper} isLoading={history === undefined}>
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
      {favorites.length > 0 && (
        <MenuBarExtra.Section title="Favorites">
          {favorites.slice(0, 9).map((item, index) => (
            <ColorMenuItem key={getFormattedColor(item.color)} item={item} index={index} />
          ))}
          <MenuBarExtra.Item
            title="View All Favorite Colors"
            icon={Icon.Star}
            onAction={() => launchCommand({ name: "favorite-colors", type: LaunchType.UserInitiated })}
          />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section title="Recent Colors">
        {recentColors.slice(0, 9).map((item, index) => (
          <ColorMenuItem
            key={getFormattedColor(item.color)}
            item={item}
            index={index}
            onRemove={() => remove(item.color)}
          />
        ))}
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

function ColorMenuItem({ item, index, onRemove }: { item: HistoryItem; index: number; onRemove?: () => void }) {
  const formattedColor = getFormattedColor(item.color);
  return (
    <MenuBarExtra.Item
      icon={getIcon(getPreviewColor(item.color))}
      title={formattedColor}
      subtitle={item.title}
      shortcut={getShortcut(index)}
      onAction={async (event) => {
        if (event.type === "right-click" && onRemove) {
          onRemove();
          await showHUD("Deleted color from history");
        } else {
          await Clipboard.copy(formattedColor);
          await showHUD("Copied color to clipboard");
        }
      }}
    />
  );
}
