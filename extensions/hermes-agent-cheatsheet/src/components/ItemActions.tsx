import { Action, ActionPanel, Icon, Keyboard, openExtensionPreferences, useNavigation } from "@raycast/api";
import { cheatsheetItems } from "../data";
import { getExamples, getModelPersonalizationState, getPrimarySelection } from "../lib/examples";
import { getRelatedItems } from "../lib/related";
import type { CheatsheetItem, ExtensionPreferences } from "../types";
import { ItemDetail } from "./ItemDetail";

const PASTE_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "p" },
  Windows: { modifiers: ["ctrl", "shift"], key: "p" },
};

const FAVORITE_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "f" },
  Windows: { modifiers: ["ctrl", "shift"], key: "f" },
};

const PREVIEW_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "d" },
  Windows: { modifiers: ["ctrl", "shift"], key: "d" },
};

interface ItemActionsProps {
  item: CheatsheetItem;
  searchText?: string;
  contextCommand?: string;
  preferences: ExtensionPreferences;
  relatedItems?: CheatsheetItem[];
  isFavorite?: boolean;
  isShowingDetail?: boolean;
  onToggleFavorite?: (id: string) => void;
  onToggleDetail?: () => void;
  onUse?: (id: string) => void;
  showDetailsAction?: boolean;
}

export function ItemActions({
  item,
  searchText = "",
  contextCommand,
  preferences,
  relatedItems: providedRelatedItems,
  isFavorite = false,
  isShowingDetail,
  onToggleFavorite,
  onToggleDetail,
  onUse,
  showDetailsAction = true,
}: ItemActionsProps) {
  const { pop } = useNavigation();
  const examples = getExamples(item, preferences);
  const primarySelection = getPrimarySelection(item, searchText, preferences, contextCommand);
  const matchedExample = primarySelection.example;
  const useExample = primarySelection.kind === "example";
  const primaryContent = primarySelection.content;
  const primaryLabel = useExample ? "Example" : "Usage";
  const otherExamples = examples.filter((example) => example.command !== matchedExample?.command);
  const relatedItems = providedRelatedItems ?? getRelatedItems(item, cheatsheetItems);
  const recordUse = () => onUse?.(item.id);
  const personalization = getModelPersonalizationState(examples, preferences);
  const missingPrefLabel =
    personalization.missingModel && personalization.missingProvider
      ? "Model and Provider"
      : personalization.missingProvider
        ? "Provider"
        : "Model";
  const personalizeTitle = personalization.needsPreferences
    ? `Set Preferred ${missingPrefLabel} to Personalize Examples…`
    : "Set Preferred Model…";

  const copyAction = (
    <Action.CopyToClipboard
      title={`Copy ${primaryLabel}`}
      content={primaryContent}
      icon={Icon.Clipboard}
      onCopy={recordUse}
    />
  );
  const pasteAction = (
    <Action.Paste
      title={`Paste ${primaryLabel}`}
      content={primaryContent}
      icon={Icon.Terminal}
      shortcut={PASTE_SHORTCUT}
      onPaste={recordUse}
    />
  );

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {showDetailsAction ? (
          <Action.Push
            title="Show Details"
            icon={Icon.Eye}
            onPush={recordUse}
            target={
              <ItemDetail
                item={item}
                preferences={preferences}
                onUse={onUse}
                contextCommand={matchedExample?.command}
              />
            }
          />
        ) : (
          <Action title="Back to Commands" icon={Icon.ArrowLeft} onAction={pop} />
        )}
        {copyAction}
        {pasteAction}
        {otherExamples.length ? (
          <ActionPanel.Submenu title={`Other Examples (${otherExamples.length})…`} icon={Icon.List}>
            {otherExamples.map((example) => (
              <Action.CopyToClipboard
                key={example.command}
                title={example.title}
                content={example.command}
                icon={Icon.Document}
                onCopy={recordUse}
              />
            ))}
          </ActionPanel.Submenu>
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section title="Personalize">
        {onToggleFavorite ? (
          <Action
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            icon={isFavorite ? Icon.StarDisabled : Icon.Star}
            shortcut={FAVORITE_SHORTCUT}
            onAction={() => onToggleFavorite(item.id)}
          />
        ) : null}
        {onToggleDetail && typeof isShowingDetail === "boolean" ? (
          <Action
            title={isShowingDetail ? "Hide Detail Preview" : "Show Detail Preview"}
            icon={isShowingDetail ? Icon.Sidebar : Icon.AppWindowSidebarLeft}
            shortcut={PREVIEW_SHORTCUT}
            onAction={onToggleDetail}
          />
        ) : null}
        <Action title={personalizeTitle} icon={Icon.Gear} onAction={openExtensionPreferences} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Reference">
        {useExample ? (
          <Action.CopyToClipboard title="Copy Generic Usage" content={item.usage} icon={Icon.Code} onCopy={recordUse} />
        ) : matchedExample ? (
          <Action.CopyToClipboard
            title="Copy Concrete Example"
            content={matchedExample.command}
            icon={Icon.Document}
            onCopy={recordUse}
          />
        ) : null}
        <Action.OpenInBrowser
          title="Open Official Documentation"
          url={item.documentationUrl}
          icon={Icon.Book}
          shortcut={Keyboard.Shortcut.Common.OpenWith}
        />
        <Action.OpenInBrowser
          title="Open Hermes Agent Repository"
          url="https://github.com/NousResearch/hermes-agent"
          icon={Icon.Globe}
        />
        <Action.CopyToClipboard title="Copy Documentation URL" content={item.documentationUrl} icon={Icon.Link} />
        {relatedItems.length ? (
          <ActionPanel.Submenu title="Related Commands…" icon={Icon.ArrowRight}>
            {relatedItems.map((relatedItem) => (
              <Action.Push
                key={relatedItem.id}
                title={relatedItem.name}
                icon={Icon.Eye}
                onPush={() => onUse?.(relatedItem.id)}
                target={<ItemDetail item={relatedItem} preferences={preferences} onUse={onUse} />}
              />
            ))}
          </ActionPanel.Submenu>
        ) : null}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
