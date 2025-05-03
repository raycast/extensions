import { Action, ActionPanel, closeMainWindow, getPreferenceValues, Icon, List, PopToRootType } from "@raycast/api";
import { KeymapDropdown } from "./keymap-dropdown";
import { generateHotkeyText } from "./hotkey-text-formatter";
import { Application, Keymap, Section, SectionShortcut } from "../model/internal/internal-models";
import { runShortcuts } from "../engine/shortcut-runner";
import useKeyCodes from "../load/key-codes-provider";
import { useEffect, useState } from "react";

interface ShortcutsListProps {
  application: Application | undefined;
}

interface Preferences {
  delay: string;
}

export function ShortcutsList({ application }: ShortcutsListProps) {
  const keyCodesResponse = useKeyCodes();
  const keymaps = application?.keymaps.map((k) => k.title) ?? [];
  const [keymapSections, setKeymapSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!application) return;
    setKeymapSections(application?.keymaps[0].sections ?? []);
    setIsLoading(false);
  }, [application]);

  const handleShortcutExecution = async (application: Application, sectionShortcut: SectionShortcut) => {
    if (keyCodesResponse.data === undefined) return;
    const delay: number = parseFloat(getPreferenceValues<Preferences>().delay);
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    await runShortcuts(application.bundleId, delay, sectionShortcut.sequence, keyCodesResponse.data);
  };

  const handleKeymapChange = (newValue: string) => {
    setKeymapSections(selectKeymap(application?.keymaps ?? [], newValue)?.sections ?? []);
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for shortcuts"
      searchBarAccessory={<KeymapDropdown keymaps={keymaps} onKeymapChange={handleKeymapChange} />}
      navigationTitle={application?.name}
    >
      {application &&
        keymapSections.map((section) => {
          return (
            <List.Section key={section.title} title={section.title}>
              {section.hotkeys.map((shortcut) => {
                // It is possible the same title is repeated, with two alternative key sequences.
                // Therefore, to generate a unique key, we have to combine info about the title and key sequences.
                const generateKey = ({ title, sequence }: SectionShortcut) =>
                  `${title}-${[sequence.map(({ modifiers, base }) => `${modifiers.join("")}${base}`)].flat().join("")}`;
                return (
                  <List.Item
                    key={generateKey(shortcut)}
                    title={shortcut.title}
                    subtitle={generateHotkeyText(shortcut)}
                    accessories={
                      shortcut.comment
                        ? [
                            {
                              text: shortcut.comment,
                              icon: Icon.SpeechBubble,
                            },
                          ]
                        : undefined
                    }
                    keywords={[section.title]}
                    actions={
                      shortcut.sequence.length > 0 ? (
                        <ActionPanel>
                          <Action title="Apply" onAction={() => handleShortcutExecution(application, shortcut)} />
                        </ActionPanel>
                      ) : undefined
                    }
                  />
                );
              })}
            </List.Section>
          );
        })}
    </List>
  );
}

function selectKeymap(keymaps: Keymap[], keymapName: string): Keymap | undefined {
  return keymaps.find((keymap) => keymap.title === keymapName);
}
