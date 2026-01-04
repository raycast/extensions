/**
 * Action panel for kaomoji grid items
 */
import { Action, ActionPanel, Icon, openExtensionPreferences } from "@raycast/api";
import type { ItemActionHandlers, ItemType, Kaomoji } from "../../types";
import { ITEM_TYPES } from "../../types";
import { SHORTCUTS, t, URLS } from "../../constants";

interface SearchActionsProps {
  item: Kaomoji;
  isFavorite: boolean;
  selectedType: ItemType | "all";
  sectionItems: Kaomoji[];
  handlers: ItemActionHandlers;
}

export function SearchActions({ item, isFavorite, selectedType, sectionItems, handlers }: SearchActionsProps) {
  const getNextTypeLabel = () => {
    const types: (ItemType | "all")[] = ["all", ...ITEM_TYPES];
    const currentIndex = types.indexOf(selectedType);
    const nextType = types[(currentIndex + 1) % types.length];
    return t(`itemTypes.${nextType}`);
  };

  const isCustom = handlers.isCustomArt?.(item.text) ?? false;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title={t("actions.pasteToCode")} icon={Icon.Document} onAction={() => handlers.onPaste(item)} />
        <Action
          title={t("actions.copyToClipboard")}
          icon={Icon.Clipboard}
          shortcut={SHORTCUTS.copy}
          onAction={() => handlers.onCopy(item)}
        />
        <Action
          title={t("actions.pasteKeepOpen")}
          icon={Icon.Window}
          shortcut={SHORTCUTS.pasteKeepOpen}
          onAction={() => handlers.onPasteKeepOpen(item)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title={t("actions.copyUnicode")}
          icon={Icon.Code}
          shortcut={SHORTCUTS.copyUnicode}
          onAction={() => handlers.onCopyUnicode(item)}
        />
        <Action
          title={t("actions.copyAllFromSection")}
          icon={Icon.List}
          shortcut={SHORTCUTS.copyAllFromSection}
          onAction={() => handlers.onCopyAllFromSection(sectionItems)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title={isFavorite ? t("actions.unpin") : t("actions.pin")}
          icon={isFavorite ? Icon.TackDisabled : Icon.Tack}
          shortcut={SHORTCUTS.togglePin}
          onAction={() => handlers.onToggleFavorite(item.text)}
        />
        <Action
          title={`${t("actions.switchType")}: ${getNextTypeLabel()}`}
          icon={Icon.Switch}
          shortcut={SHORTCUTS.switchType}
          onAction={handlers.onToggleType}
        />
        {isCustom && handlers.onRemoveCustomArt && (
          <Action
            title={t("actions.removeFromCollection")}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={SHORTCUTS.delete}
            onAction={() => handlers.onRemoveCustomArt!(item.text)}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser title={t("actions.submitArt")} icon={Icon.Plus} url={URLS.submitArt} />
        <Action title={t("actions.openPreferences")} icon={Icon.Gear} onAction={openExtensionPreferences} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
