# Safari Profile Shortcuts

Open new Safari profile windows from Raycast. The extension has five fixed command slots, so each slot can have its own Raycast global hotkey.

Safari 17 or later is required. Create and manage Safari profiles in Safari before configuring their exact names in Raycast.

## Setup

On first use, allow Raycast in **System Settings → Privacy & Security**:

- **Accessibility**, so Raycast can select Safari's File menu item.
- **Automation**, so Raycast can control Safari.

Open this extension's settings in Raycast and set **Profile Slots 1–5** to the exact matching Safari profile names. Slots 1–3 default to Personal, School, and Work; slots 4–5 are empty until you configure them.

Commands show only their corresponding slot numbers, not the Safari profile names you assign, because Raycast does not support dynamically renaming commands from preferences.

Assign a global hotkey with **Configure Command** or **Raycast Settings → Shortcuts**.

- Rename a profile: update its slot to the new exact Safari profile name.
- Add a profile: fill an empty slot, enable its command, and assign a hotkey.
- Remove a profile: clear its slot, remove its hotkey, and disable its command.

Safari's current File-menu labels are matched in English (`New <Profile> Window`), so this version requires English Safari menu labels.

## Development

```bash
npm install
npm run dev
```
