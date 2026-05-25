import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";

const HELP_MD = `# Mac Updater

Every shortcut and feature, in one place.

## Updating

| Shortcut | Action |
|---|---|
| ⏎ | Update the focused app or package |
| Space | Select an app for batch update |
| ⌘ ⇧ U | Open Update Everything — runs every pending update |
| ⌘ R | Refresh the current scan |
| ⌘ ⇧ R | Force rescan (ignore cache) |
| ⌘ ⌥ ⏎ | Update Selected when you have a multi-select active |

## Adoption

| Shortcut | Action |
|---|---|
| ⌘ ⇧ A | Adopt all eligible apps to Homebrew |
| ⌘ ⇧ H | Switch the focused app to Homebrew (when a cask matches) |
| ⌘ K | Adopt with a custom cask name |
| ⌘ J | Wire up a custom Sparkle feed URL |
| ⌘ ⇧ M | Search the Mac App Store and map an app to its store ID |

## Quieting noise

| Shortcut | Action |
|---|---|
| ⌘ ⇧ S | Snooze an app for 1 / 7 / 30 / 90 days |
| ⌘ ⇧ I | Hide an app forever |
| ⌘ ⇧ ⌫ | Don't suggest adopting this app |

All three are reversible from **Installed → Hidden**.

## Navigation

| Shortcut | Action |
|---|---|
| ⌘ D | Toggle the detail pane |
| ⌘ N | Open release notes in browser |
| ⌘ ⇧ . | Copy the bundle ID |
| ⌘ ⎋ | Clear the current multi-select |
| ⌘ ? | Show this help |

## Commands

Mac Updater installs four commands. You can open any of them from Raycast's root search.

- **Mac Updater** — the main view you're in now
- **Update Everything** — one-shot queue across every source
- **Mac Updater Menu Bar** — passive update count in the macOS menu bar
- **Auto-Update in Background** — runs silently every 12h once enabled. Configure via right-click → Configure Command, or use the "Auto-Update Settings" action below.

## Sources

The extension watches ten update channels at once. Each app shows under every source it uses:

- **Homebrew** — apps + CLI tools installed via brew
- **App Store** — anything with a Mac App Store receipt
- **Sparkle** — the most common Mac auto-updater (most indie apps)
- **Electron** — VS Code, Cursor, Slack, Discord, and friends
- **GitHub** — apps that publish releases on GitHub
- **npm / pip / gem** — your CLI globals

Apps that don't expose any of these land under **Installed → No Source**, where you can wire one up by hand or adopt to Homebrew.

---

_Mac Updater never updates anything without an explicit click. Everything that runs is logged to **Installed → History**._
`;

export default function Help() {
  const { pop } = useNavigation();
  return (
    <Detail
      markdown={HELP_MD}
      navigationTitle="Help"
      actions={
        <ActionPanel>
          <Action title="Close" icon={Icon.XMarkCircle} onAction={pop} />
          <Action.OpenInBrowser
            title="Visit brew.sh"
            url="https://brew.sh"
            icon={Icon.Globe}
          />
        </ActionPanel>
      }
    />
  );
}
