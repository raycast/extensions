<p align="center">
  <img src="media/menu-bar-icon.png" width="96" alt="Menu Bar Icon Search icon" />
</p>

<h1 align="center">Menu Bar Icon Search</h1>

<p align="center">
  Find a menu bar app, press Return, and open its icon.
</p>

<p align="center">
  <img src="media/menu-bar-icon-search-preview.png" width="850" alt="Raycast showing menu bar app icons with CleanShot X selected" />
  <br />
  <sub>Search by app or item name, then press Return to open its menu.</sub>
</p>

Menu Bar Icon Search is a Raycast extension for the app icons on the right side of the macOS menu bar. It can also open icons hidden with macOS's **Menu Bar** setting: it reveals the icon, opens it in the real menu bar, and restores its hidden state when the menu closes.

> **Looking for File, Edit, and other menus of the active app?** Raycast's built-in **Search Menu Bar Items** command does that. This extension searches the app icons on the other side of the menu bar.

## Why this exists

With macOS 27 Golden Gate, I can choose which icons to show in **System Settings → Menu Bar**, and use the chevron to reach icons tucked away around the notch. For my setup, that made a full menu bar manager such as Ice, Thaw, or Bartender unnecessary.

One thing was still missing: a fast way to open the menu of a hidden app icon. I wanted to type the app's name, press Return, and get its menu without first revealing the icons and looking for the right one. This extension adds that one action to Raycast.

## What it does

- **Search by app or item name.** Results show each app's icon and update as you type.
- **Stay on the keyboard.** Use ↑ and ↓ to choose an icon, then press Return to open it.
- **Start with results.** The last successful scan appears immediately while a fresh scan runs.
- **Open hidden icons in place.** For supported macOS-hidden icons, the extension reveals the icon temporarily and restores your menu bar afterward. Your pointer returns to its original position.
- **Keep system controls optional.** Wi-Fi, Sound, Control Center, and other macOS items are excluded by default and can be enabled in the extension's preferences.

The bundled Swift helper handles discovery and activation through macOS Accessibility. It runs only for a scan or an activation; there is no separate app or resident background process. The last scan is stored locally by Raycast.

## Requirements

- Raycast on macOS and Accessibility access for the bundled `menubar-helper`
- macOS 27 Golden Gate on Apple silicon to open icons hidden through System Settings → Menu Bar

## Get started

1. In Raycast, open **Search Menu Bar Icons**.
2. Grant Accessibility access to `menubar-helper` when macOS requests it, then reopen the command.
3. Assign a shortcut to **Search Menu Bar Icons** in Raycast's extension settings if you want instant access.

| In the list | Action |
| --- | --- |
| Type | Filter by app or item name |
| ↑ / ↓ | Select a result |
| Return | Open the selected icon |
| ⌘ R | Refresh the scan |
| **Copy Item Details** | Copy diagnostic data for an item |

## Hidden icons and limitations

For an icon hidden through macOS's **Menu Bar** setting, the helper temporarily enables the app's switch, opens the icon in the real menu bar, and turns the switch off after the menu or panel closes. System Settings may briefly load in the background. If the helper is forcibly terminated while a menu is open, you may need to turn the switch off manually. Icons hidden by other tools may not have a corresponding macOS switch.

Results depend on what each app exposes through Accessibility. The extension removes duplicates when it can identify the same element, frame, or identifier without conflicting positions. A cached result can be briefly out of date until the next scan finishes; use **Refresh Items** if an app changes. An app may control where its own panel opens.

The helper includes Apple silicon and Intel binaries. Opening icons hidden through System Settings → Menu Bar requires macOS 27, which is available only on Apple silicon. Visible-icon search on earlier macOS versions and Intel hardware has not been physically verified.

## Development

Run `npm install` and `npm run dev` to load the extension locally. After changing the Swift helper, run `./build-helper.sh` to rebuild `assets/menubar-helper`. Run `npm run build` and `npm run lint` to check the Raycast extension. The bundled helper is built from [swift/MenuBarHelper.swift](swift/MenuBarHelper.swift) for Apple silicon and Intel Macs.

For a local development installation, Raycast copies the helper to `~/.config/raycast/extensions/menu-bar-icon-search/assets/`. Rebuilding the helper may require granting Accessibility access again.

## License

MIT © 2026 Marc Güell Segarra ([ondori.dev](https://ondori.dev)). See [LICENSE](LICENSE).
