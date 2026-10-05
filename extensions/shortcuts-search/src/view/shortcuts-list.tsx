import { AccountActions } from "./account-actions";
import {
  showToast,
  Toast,
  Action,
  ActionPanel,
  closeMainWindow,
  getPreferenceValues,
  Icon,
  List,
  PopToRootType,
  popToRoot,
} from "@raycast/api";
import { useState } from "react";
import { validateTarget, parseDelay, type ExecutionTarget } from "../engine/execution-target";
import { supportsPlatform } from "../shortcut-core/platforms";
import { getPlatform } from "../load/platform";
import { runShortcuts, validateSequence } from "../engine/shortcut-runner";
import useKeyCodes from "../load/key-codes-provider";
import type { Application, Keymap, SectionShortcut } from "../model/internal/internal-models";
import { toShortcutFavoriteIdentifier, type FavoriteIdentifier } from "../user-data/favorites";
import type { Favorite } from "../user-data/models";
import { FavoriteAction } from "./favorite-action";
import { generateHotkeyAccessories } from "./hotkey-text-formatter";
import { KeymapDropdown } from "./keymap-dropdown";

interface ShortcutsListProps {
  executionTarget?: ExecutionTarget;
  application: Application | undefined;
  favorites?: Favorite[];
  initialKeymapTitle?: string;
  initialSearchText?: string;
  isLoading?: boolean;
  onToggleFavorite?: (identifier: FavoriteIdentifier) => Promise<void>;
}

interface Preferences {
  delay: string;
}

export function ShortcutsList({
  application,
  executionTarget,
  favorites = [],
  initialKeymapTitle,
  initialSearchText,
  isLoading,
  onToggleFavorite,
}: ShortcutsListProps) {
  const keyCodesResponse = useKeyCodes();
  const keymaps = (application?.keymaps ?? []).filter((keymap) => supportsPlatform(keymap.platforms, getPlatform()));
  const [selectedKeymapTitle, setSelectedKeymapTitle] = useState(initialKeymapTitle);
  const [searchText, setSearchText] = useState(initialSearchText ?? "");
  const selectedKeymap = selectKeymap(keymaps, selectedKeymapTitle) ?? keymaps[0];

  const canExecute = (shortcut: SectionShortcut) => {
    if (!executionTarget || !keyCodesResponse.data) return false;
    try {
      validateTarget(executionTarget);
      validateSequence(shortcut.sequence, keyCodesResponse.data);
      return true;
    } catch {
      return false;
    }
  };
  const handleShortcutExecution = async (shortcut: SectionShortcut) => {
    if (!executionTarget || !keyCodesResponse.data) return;
    try {
      const delay = parseDelay(getPreferenceValues<Preferences>().delay);
      validateTarget(executionTarget);
      validateSequence(shortcut.sequence, keyCodesResponse.data);
      // Popping to root unloads this command, so wait until execution completes.
      await closeMainWindow({ popToRootType: PopToRootType.Suspended });
      await runShortcuts(executionTarget, delay, shortcut.sequence, keyCodesResponse.data);
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Shortcut was not completed",
        message: error instanceof Error ? error.message : "Please retry manually",
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      filtering
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for shortcuts"
      searchBarAccessory={
        <KeymapDropdown
          keymaps={keymaps.map((keymap) => keymap.title)}
          value={selectKeymap(keymaps, selectedKeymapTitle)?.title}
          initialValue={initialKeymapTitle}
          onKeymapChange={setSelectedKeymapTitle}
        />
      }
      navigationTitle={application?.name}
    >
      {application && selectedKeymap
        ? selectedKeymap.sections.map((section) => (
            <List.Section key={section.title} title={section.title}>
              {section.hotkeys.map((shortcut) => {
                const hotkeyAccessories = generateHotkeyAccessories(shortcut);
                const commentAccessory: List.Item.Accessory[] = shortcut.comment
                  ? [{ text: shortcut.comment, icon: Icon.SpeechBubble }]
                  : [];
                const favoriteIdentifier = toShortcutFavoriteIdentifier(
                  application,
                  selectedKeymap.title,
                  section.title,
                  shortcut
                );

                return (
                  <List.Item
                    key={generateShortcutKey(shortcut)}
                    title={shortcut.title}
                    accessories={[...hotkeyAccessories, ...commentAccessory]}
                    keywords={[section.title]}
                    actions={
                      <ActionPanel>
                        {canExecute(shortcut) ? (
                          <Action title="Apply" onAction={() => handleShortcutExecution(shortcut)} />
                        ) : null}
                        {onToggleFavorite ? (
                          <FavoriteAction
                            identifier={favoriteIdentifier}
                            favorites={favorites}
                            onToggle={onToggleFavorite}
                          />
                        ) : null}
                        <AccountActions />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          ))
        : null}
    </List>
  );
}

function selectKeymap(keymaps: Keymap[], keymapName: string | undefined): Keymap | undefined {
  return keymaps.find((keymap) => keymap.title === keymapName);
}

function generateShortcutKey({ title, sequence }: SectionShortcut): string {
  return `${title}-${sequence.map(({ modifiers, base }) => `${modifiers.join("")}${base}`).join("")}`;
}
