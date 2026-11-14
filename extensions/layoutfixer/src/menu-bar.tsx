import {
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { languageName } from "./lib/engine";
import { getInputSources, InputSources, selectLayout } from "./lib/macos";

const LABEL = { en: "EN", fa: "فا" } as const;

function launch(name: string) {
  return () => launchCommand({ name, type: LaunchType.UserInitiated }).catch(() => undefined);
}

export default function Command() {
  const { menuBarStyle } = getPreferenceValues<Preferences.MenuBar>();
  const [sources, setSources] = useState<InputSources | null>();

  useEffect(() => {
    getInputSources()
      .then(setSources)
      .catch(() => setSources(null));
  }, []);

  const current = sources?.current?.lang;
  const other = current === "fa" ? "en" : "fa";
  const canSwitch = !!sources?.enabled.en && !!sources?.enabled.fa;

  return (
    <MenuBarExtra
      isLoading={sources === undefined}
      icon={menuBarStyle === "text" ? undefined : Icon.Keyboard}
      title={menuBarStyle === "icon" ? undefined : current ? LABEL[current] : "—"}
      tooltip={current ? `Keyboard: ${languageName(current)}` : "LayoutFixer"}
    >
      <MenuBarExtra.Section title={current ? `Keyboard: ${languageName(current)}` : "No English or Persian layout"}>
        {canSwitch ? (
          <MenuBarExtra.Item
            title={`Switch to ${languageName(other)}`}
            icon={Icon.Switch}
            onAction={async () => {
              await selectLayout(other);
              await showHUD(`Keyboard: ${languageName(other)}`);
            }}
          />
        ) : null}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Fix">
        <MenuBarExtra.Item title="Fix Selected Text" icon={Icon.Wand} onAction={launch("fix-selection")} />
        <MenuBarExtra.Item title="Fix Clipboard" icon={Icon.Clipboard} onAction={launch("fix-clipboard")} />
        <MenuBarExtra.Item title="Undo Last Fix" icon={Icon.Undo} onAction={launch("undo-last-fix")} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Tools">
        <MenuBarExtra.Item title="Check Spelling" icon={Icon.Text} onAction={launch("fix-spelling")} />
        <MenuBarExtra.Item title="Persian Tools" icon={Icon.Calculator} onAction={launch("persian-tools")} />
        <MenuBarExtra.Item title="AI Writing Tools" icon={Icon.Stars} onAction={launch("ai-tools")} />
        <MenuBarExtra.Item title="Convert Text" icon={Icon.TextInput} onAction={launch("convert-text")} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Setup and Shortcuts" icon={Icon.QuestionMarkCircle} onAction={launch("setup")} />
        <MenuBarExtra.Item title="Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
