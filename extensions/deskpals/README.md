# Deskpals

Configure your [Deskpals](https://deskpals.cc) macOS app from Raycast — pick a sprite, toggle visibility, and resize the overlay area without leaving your keyboard.

## Requirements

This extension is a **companion** to the Deskpals macOS app. The app must be installed and have been launched at least once for the extension to work — Raycast sends commands to it via the `deskpals://` URL scheme, and reads its preferences to determine which sprites are currently active.

Install Deskpals: <https://deskpals.cc>

## Commands

### Change Sprite

Searchable list of all Pokémon (Gen 1–4) plus any custom sprites you've added. Pick one and the desk pal swaps in instantly.

- Use the dropdown to switch between **Normal** and **Shiny** variants
- Switch to **Currently Active** to filter down to sprites already on screen
- Custom sprites placed in `~/Library/Application Support/deskpals/CustomSprites/<name>/default_idle_8fps.gif` are auto-discovered and listed under a **Custom** section
- Active sprites show a checkmark accessory and refresh every 2 seconds

### Toggle Visibility

One-shot command — shows or hides the Deskpals overlay without opening any UI.

### Resize Area

Form to set the overlay area's width and height (200–2000 px each). Useful if your desk pals are clipping or you want to constrain them to a specific region of the screen.

## How it works

Each command builds a `deskpals://` URL and opens it. The Deskpals app registers as the handler for that scheme and acts on the request:

| Command | URL |
| --- | --- |
| Change Sprite | `deskpals://pokemon?name=<name>&gen=<n>&shiny=<bool>` |
| Toggle Visibility | `deskpals://toggle` |
| Resize Area | `deskpals://resize?width=<w>&height=<h>` |

The Change Sprite command additionally reads `~/Library/Preferences/com.deskpals.app.plist` to display which sprites are currently active.
