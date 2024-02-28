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
import { Application, AtomicShortcut, Keymap, Section, SectionShortcut } from "./model/internal/internal-models";
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

export default function AppShortcuts(props?: { app: Application }) {
  const [application, setApplication] = useState<Application | undefined>(props?.app);
  const [bundleId, setBundleId] = useState(props?.app?.bundleId);
  const [keymaps, setKeymaps] = useState<string[]>([]);
  const [keymapSections, setKeymapSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const keyCodesResponse = useKeyCodes();
  const shortcutsProviderResponse = useAllShortcuts({ execute: !props?.app });

  useEffect(() => {
    if (application || shortcutsProviderResponse.isLoading || !bundleId) {
      return;
    }
    const foundApp = shortcutsProviderResponse.data.applications.find((app) => app.bundleId === bundleId);
    if (!foundApp) {
      // noinspection JSIgnoredPromiseFromCall
      closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
      // noinspection JSIgnoredPromiseFromCall
      showFailureToast(undefined, { title: `Shortcuts not available for application ${bundleId}` });
      return;
    }
    setApplication(foundApp);
  }, [shortcutsProviderResponse.isLoading, bundleId, application]);

  useEffect(() => {
    if (!application) return;
    const foundKeymaps = application?.keymaps.map((k) => k.title) ?? [];
    const foundSections = application?.keymaps[0].sections ?? [];
    setKeymaps(foundKeymaps);
    setKeymapSections(foundSections);
    setIsLoading(false);
  }, [application]);

  usePromise(async () => application?.bundleId ?? (await getFrontmostApplication()).bundleId, [], {
    onData: (bundleId) => {
      if (!bundleId) return;
      setBundleId(bundleId);
    },
    execute: !props?.app,
  });

  const onKeymapChange = (newValue: string) => {
    setKeymapSections(selectKeymap(application?.keymaps ?? [], newValue)?.sections ?? []);
  };

  async function executeShortcut(bundleId: string | undefined, shortcutSequence: AtomicShortcut[]) {
    if (keyCodesResponse.data === undefined) return;
    const delay: number = parseFloat(getPreferenceValues<Preferences>().delay);
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    await runShortcuts(bundleId, delay, shortcutSequence, keyCodesResponse.data);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for shortcuts"
      searchBarAccessory={<KeymapDropdown keymaps={keymaps} onKeymapChange={onKeymapChange} />}
      navigationTitle={application?.name}
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
                          onAction={() => application && executeShortcut(application.bundleId, shortcut.sequence)}
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
