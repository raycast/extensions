# Lost

Find and focus a specific window of a running Mac app, or cycle to the next or previous window.

## Commands

- **Find Window** — type `lost`, optionally an app name, then choose a window. Enter focuses it and switches to its Space.
- **Next Window** / **Previous Window** — cycle through windows of the current app (or of an app name you pass). Assign hotkeys in Raycast for the fastest workflow.

Leave the app name blank in Find Window to list every window, grouped by app. You can still filter by window title in the list.

## Permissions

Lost uses a native helper (`assets/lost-windows`, built from `swift/LostWindows.swift`).

- **Accessibility** — required to raise a specific window. Grant access to Raycast in **System Settings → Privacy & Security → Accessibility**.
- **Screen Recording** — optional. Needed only for window previews in the detail pane. Grant access in **System Settings → Privacy & Security → Screen Recording**.

macOS only.

## Development

```bash
npm install
npm run dev
```

Rebuild the helper after changing Swift sources:

```bash
npm run build:swift
```

That script produces a universal `arm64` + `x86_64` binary in `assets/lost-windows`.
