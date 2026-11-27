import {
  Action,
  ActionPanel,
  Color,
  Icon,
  launchCommand,
  LaunchType,
  List,
  open,
  openExtensionPreferences,
  popToRoot,
  showHUD,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getInputSources, hasAccessibility, InputSources, persianLayoutFor, SETTINGS_URLS } from "./lib/macos";
import { markSetupSeen } from "./lib/storage";

const EXAMPLE_PERSIAN_KEYS = "صشدف فخ لقشذ معدزا فخیشغ";
const EXAMPLE_ENGLISH_KEYS = "sghl o,fd?";

interface Shortcut {
  command: string;
  title: string;
  keys: string;
  what: string;
}

const SHORTCUTS: Shortcut[] = [
  {
    command: "fix-selection",
    title: "Fix Selected Text",
    keys: "⌃ ⌥ F",
    what: "The main one: fixes the selection, or the current line",
  },
  {
    command: "undo-last-fix",
    title: "Undo Last Fix",
    keys: "⌃ ⌥ Z",
    what: "Puts back what you typed and the keyboard layout",
  },
  { command: "switch-layout", title: "Switch Keyboard Layout", keys: "⌃ ⌥ L", what: "English ⇄ Persian" },
  {
    command: "fix-spelling",
    title: "Check Spelling",
    keys: "⌃ ⌥ S",
    what: "Spelling suggestions, English and Persian",
  },
  { command: "finglish-to-persian", title: "Finglish to Persian", keys: "⌃ ⌥ P", what: "salam khobi → سلام خوبی" },
  { command: "clean-up-persian", title: "Clean up Persian Text", keys: "⌃ ⌥ C", what: "Half-spaces, punctuation, ی/ک" },
  { command: "persian-tools", title: "Persian Tools", keys: "⌃ ⌥ T", what: "Numbers to words, Jalali dates" },
  {
    command: "ai-tools",
    title: "AI Writing Tools",
    keys: "⌃ ⌥ A",
    what: "Rewrite, formal/casual, translate (Raycast Pro)",
  },
];

type Status = "ok" | "missing" | "unknown";

function statusIcon(status: Status | undefined) {
  if (status === "ok") return { source: Icon.CheckCircle, tintColor: Color.Green };
  if (status === "missing") return { source: Icon.XMarkCircle, tintColor: Color.Red };
  return { source: Icon.Circle, tintColor: Color.SecondaryText };
}

function statusTag(status: Status | undefined) {
  if (status === "ok") return { tag: { value: "Ready", color: Color.Green } };
  if (status === "missing") return { tag: { value: "Needs setup", color: Color.Red } };
  return { tag: { value: "Check", color: Color.SecondaryText } };
}

function launch(name: string) {
  return () => launchCommand({ name, type: LaunchType.UserInitiated }).catch(() => undefined);
}

export default function Command() {
  const [sources, setSources] = useState<InputSources | null>();
  const [accessibility, setAccessibility] = useState<boolean | null>();

  const refresh = () => {
    getInputSources()
      .then(setSources)
      .catch(() => setSources(null));
    hasAccessibility().then(setAccessibility);
  };

  useEffect(() => {
    markSetupSeen();
    refresh();
  }, []);

  const layoutsStatus: Status | undefined =
    sources === undefined
      ? undefined
      : sources?.enabled.en && sources.enabled.fa
        ? "ok"
        : sources
          ? "missing"
          : "unknown";
  const accessibilityStatus: Status | undefined =
    accessibility === undefined ? undefined : accessibility === null ? "unknown" : accessibility ? "ok" : "missing";
  const persianName = sources?.enabled.fa
    ? persianLayoutFor(sources) === "persian"
      ? "Persian – Legacy"
      : "Persian – Standard (ISIRI 2901)"
    : "none";

  const shortcutTable = [
    "| Command | Suggested hotkey | What it does |",
    "|---|---|---|",
    ...SHORTCUTS.map((s) => `| ${s.title} | \`${s.keys}\` | ${s.what} |`),
  ].join("\n");

  const finish = async () => {
    await markSetupSeen();
    await popToRoot();
    await showHUD("LayoutFixer is ready");
  };

  const common = (
    <ActionPanel.Section>
      <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
      <Action
        title="Finish Setup"
        icon={Icon.Checkmark}
        shortcut={{ modifiers: ["cmd"], key: "return" }}
        onAction={finish}
      />
    </ActionPanel.Section>
  );

  return (
    <List isShowingDetail navigationTitle="Setup and Shortcuts" isLoading={sources === undefined}>
      <List.Section title="1 · Checklist">
        <List.Item
          title="Keyboard Layouts"
          icon={statusIcon(layoutsStatus)}
          accessories={[statusTag(layoutsStatus)]}
          detail={
            <List.Item.Detail
              markdown={`## Keyboard layouts

LayoutFixer converts between an **English** and a **Persian** keyboard layout, so both need to be enabled.

- English: ${sources?.enabled.en ? `✅ \`${sources.enabled.en.id.replace("com.apple.keylayout.", "")}\`` : "❌ not found"}
- Persian: ${sources?.enabled.fa ? `✅ \`${sources.enabled.fa.id.replace("com.apple.keylayout.", "")}\`` : "❌ not found"}

${layoutsStatus === "ok" ? "" : "**To add one:** System Settings → Keyboard → Text Input → Edit… → **+** → Persian."}

---

برای کار کردن افزونه، هم کیبورد انگلیسی و هم کیبورد فارسی باید در سیستم فعال باشد.`}
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Open Keyboard Settings"
                icon={Icon.Keyboard}
                onAction={() => open(SETTINGS_URLS.keyboard)}
              />
              {common}
            </ActionPanel>
          }
        />
        <List.Item
          title="Accessibility Access"
          icon={statusIcon(accessibilityStatus)}
          accessories={[statusTag(accessibilityStatus)]}
          detail={
            <List.Item.Detail
              markdown={`## Accessibility access for Raycast

Needed for two things:

- **Fixing without selecting**: LayoutFixer selects the current line for you (like pressing ⌘⇧←).
- **Undo Last Fix**: it presses ⌘Z for you.

Everything else works without it.

${accessibilityStatus === "ok" ? "✅ Raycast has access." : accessibilityStatus === "missing" ? "❌ Raycast doesn't seem to have access yet. Open the settings and turn on **Raycast**." : "Couldn't check. If fixing without a selection doesn't work, turn on **Raycast** in the settings."}

---

برای اینکه افزونه بدون انتخاب کردن متن، خط فعلی را خودش انتخاب و درست کند، Raycast باید دسترسی Accessibility داشته باشد.`}
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Open Accessibility Settings"
                icon={Icon.Lock}
                onAction={() => open(SETTINGS_URLS.accessibility)}
              />
              {common}
            </ActionPanel>
          }
        />
        <List.Item
          title="Persian Layout"
          subtitle={persianName}
          icon={statusIcon(sources?.enabled.fa ? "ok" : layoutsStatus)}
          accessories={[{ text: "Automatic" }]}
          detail={
            <List.Item.Detail
              markdown={`## Your Persian layout

Detected: **${persianName}**

The two macOS Persian layouts put some letters on different keys (for example \`ذ\` and \`د\`), so LayoutFixer has to know which one you use. By default it reads it from your Mac. You can also pick it by hand in the settings.`}
            />
          }
          actions={<ActionPanel>{common}</ActionPanel>}
        />
      </List.Section>

      <List.Section title="2 · Hotkeys">
        <List.Item
          title="Set Your Hotkeys"
          icon={{ source: Icon.Keyboard, tintColor: Color.Blue }}
          accessories={[{ text: "⌃ ⌥ F" }]}
          detail={
            <List.Item.Detail
              markdown={`## Hotkeys

LayoutFixer is fastest with a hotkey: type, notice it's in the wrong layout, press the hotkey.

Open the extension settings, click a command, then click **Record Hotkey**. Suggested hotkeys:

${shortcutTable}

> Don't use ⌃ Space or ⌃ ⌥ Space: macOS uses them to switch input sources.

---

بهترین حالت استفاده با شورت‌کات است: تایپ کن، اگر زبان اشتباه بود، شورت‌کات Fix Selected Text را بزن.`}
            />
          }
          actions={
            <ActionPanel>
              <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action title="Finish Setup" icon={Icon.Checkmark} onAction={finish} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Turn on the Menu Bar Icon"
          icon={{ source: Icon.AppWindowSidebarRight, tintColor: Color.Blue }}
          accessories={[{ text: "Optional" }]}
          detail={
            <List.Item.Detail
              markdown={`## Menu bar

Shows **EN** or **فا** in the menu bar, with quick actions for every command. Press Enter to turn it on; to turn it off, deactivate the **Keyboard Layout in Menu Bar** command in Raycast's settings.`}
            />
          }
          actions={
            <ActionPanel>
              <Action title="Turn on Menu Bar Icon" icon={Icon.AppWindowSidebarRight} onAction={launch("menu-bar")} />
              {common}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="3 · Try It">
        <List.Item
          title="Fix a Sentence"
          icon={{ source: Icon.Wand, tintColor: Color.Purple }}
          detail={
            <List.Item.Detail
              markdown={`## Try it

1. Press Enter to copy this example, typed on the Persian keyboard by mistake:

   \`${EXAMPLE_PERSIAN_KEYS}\`

2. Paste it into Notes, select it, and run **Fix Selected Text**.
3. It becomes \`want to grab lunch today\`, and your keyboard switches to English.

The other way: \`${EXAMPLE_ENGLISH_KEYS}\` becomes \`سلام خوبی؟\`.

**Tip:** with nothing selected, Fix Selected Text fixes the current line, and only the words that are actually wrong.`}
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Example" content={EXAMPLE_PERSIAN_KEYS} />
              <Action.CopyToClipboard title="Copy Second Example" content={EXAMPLE_ENGLISH_KEYS} />
              <Action title="Open Convert Text" icon={Icon.TextInput} onAction={launch("convert-text")} />
              {common}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="4 · All Commands">
        {SHORTCUTS.map((s) => (
          <List.Item
            key={s.command}
            title={s.title}
            icon={Icon.Terminal}
            accessories={[{ text: s.keys }]}
            detail={<List.Item.Detail markdown={`## ${s.title}\n\n${s.what}\n\nSuggested hotkey: \`${s.keys}\``} />}
            actions={
              <ActionPanel>
                <Action title={`Open ${s.title}`} icon={Icon.ArrowRight} onAction={launch(s.command)} />
                <Action title="Set Hotkey in Settings" icon={Icon.Keyboard} onAction={openExtensionPreferences} />
                {common}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Done">
        <List.Item
          title="Finish Setup"
          icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
          detail={
            <List.Item.Detail markdown="You can open this again any time with the **Setup and Shortcuts** command, or from the menu bar icon." />
          }
          actions={
            <ActionPanel>
              <Action title="Finish Setup" icon={Icon.Checkmark} onAction={finish} />
              <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
