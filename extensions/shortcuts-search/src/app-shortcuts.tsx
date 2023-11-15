import {
  Action,
  ActionPanel,
  closeMainWindow,
  getFrontmostApplication,
  getPreferenceValues,
  Icon,
  List,
  PopToRootType,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { runShortcuts } from "./engine/shortcut-runner";
import {
  AppShortcuts,
  AtomicShortcut,
  Keymap,
  Section,
  SectionShortcut,
  Shortcuts,
} from "./model/internal/internal-models";
import { modifierSymbols } from "./model/internal/modifiers";
import useAllShortcuts from "./load/shortcuts-provider";
import useKeyCodes from "./load/key-codes-provider";

interface Preferences {
  delay: string;
}

function KeymapDropdown(props: { keymaps: string[]; onKeymapChange: (newValue: string) => void }) {
  const { keymaps, onKeymapChange } = props;
  if (keymaps.length == 1) {
    return null;
  }
  return (
    <List.Dropdown
      tooltip="Select Keymap"
      storeValue={true}
      onChange={(newValue) => {
        onKeymapChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Keymaps">
        {keymaps.map((keymap) => (
          <List.Dropdown.Item key={keymap} title={keymap} value={keymap} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function AppShortcuts(props: { bundleId: string } | undefined) {
  const [bundleId, setBundleId] = useState(props?.bundleId);
  const [appShortcuts, setAppShortcuts] = useState<AppShortcuts | undefined>();
  const [keymaps, setKeymaps] = useState<string[]>([]);
  const [keymapSections, setKeymapSections] = useState<Section[]>([]);
  const keyCodesResponse = useKeyCodes();
  const shortcutsProviderResponse = useAllShortcuts();

  const initAppShortcuts = (bundleId: string, shortcuts: Shortcuts) => {
    const foundApp = shortcuts.applications.find((app) => app.bundleId === bundleId);
    if (!foundApp) {
      closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
      showFailureToast(undefined, { title: `Shortcuts not available for application ${bundleId}` });
    } else {
      const foundKeymaps = foundApp?.keymaps.map((k) => k.title) ?? [];
      const foundSections = foundApp?.keymaps[0].sections ?? [];
      setAppShortcuts(foundApp);
      setKeymaps(foundKeymaps);
      setKeymapSections(foundSections);
    }
  };

  useEffect(() => {
    if (shortcutsProviderResponse.isLoading || !bundleId) {
      return;
    }
    initAppShortcuts(bundleId, shortcutsProviderResponse.shortcuts); // init only when everything loaded
  }, [shortcutsProviderResponse.isLoading, bundleId]);

  usePromise(
    async () => {
      return bundleId ?? (await getFrontmostApplication()).bundleId;
    },
    [],
    {
      onData: (bundleId) => {
        if (!bundleId) return;
        setBundleId(bundleId);
      },
    }
  );

  const onKeymapChange = (newValue: string) => {
    setKeymapSections(selectKeymap(appShortcuts?.keymaps ?? [], newValue)?.sections ?? []);
  };

  async function executeShortcut(bundleId: string, shortcutSequence: AtomicShortcut[]) {
    if (keyCodesResponse.data === undefined) return;
    const delay: number = parseFloat(getPreferenceValues<Preferences>().delay);
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    await runShortcuts(bundleId, delay, shortcutSequence, keyCodesResponse.data);
  }

  return (
    <List
      isLoading={keymapSections.length === 0}
      navigationTitle="Current App Shortcuts"
      searchBarPlaceholder="Search for shortcuts"
      searchBarAccessory={<KeymapDropdown keymaps={keymaps} onKeymapChange={onKeymapChange} />}
    >
      {keymapSections.map((section) => {
        return (
          <List.Section key={section.title} title={section.title}>
            {section.hotkeys.map((shortcut) => {
              return (
                <List.Item
                  key={shortcut.title}
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
                        <Action
                          title="Apply"
                          onAction={() => appShortcuts && executeShortcut(appShortcuts.bundleId, shortcut.sequence)}
                        />
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

function generateHotkeyText(shortcut: SectionShortcut): string {
  return shortcut.sequence
    .map((atomicShortcut) => {
      const modifiersText = atomicShortcut.modifiers.map((modifier) => modifierSymbols.get(modifier)).join("") ?? "";
      return modifiersText + overrideSymbolIfPossible(atomicShortcut.base);
    })
    .join(" ");
}

function overrideSymbolIfPossible(base: string) {
  if (baseKeySymbolOverride.has(base)) {
    return baseKeySymbolOverride.get(base);
  }
  return base.toUpperCase();
}

const baseKeySymbolOverride: Map<string, string> = new Map([
  ["left", "←"],
  ["right", "→"],
  ["up", "↑"],
  ["down", "↓"],
  ["pageup", "PgUp"],
  ["pagedown", "PgDown"],
  ["home", "Home"],
  ["end", "End"],
  ["space", "Space"],
  ["capslock", "⇪"],
  ["backspace", "⌫"],
  ["tab", "⇥"],
  ["esc", "⎋"],
  ["enter", "↩"],
  ["cmd", "⌘"],
  ["ctrl", "⌃"],
  ["opt", "⌥"],
  ["shift", "⇧"],
]);
