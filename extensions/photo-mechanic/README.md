# Photo Mechanic

Send your active [Lightroom Classic](https://www.adobe.com/products/photoshop-lightroom-classic.html) photo to [Photo Mechanic](https://home.camerabits.com) with a single keystroke.

## Commands

### Send Lightroom Photo to Photo Mechanic

Reveals the currently active photo in Lightroom Classic inside Photo Mechanic — the containing folder opens as a contact sheet with that specific image selected. Equivalent to dragging the file onto Photo Mechanic's icon.

**Use case:** Photojournalists and editorial shooters who cull and caption in Photo Mechanic but edit in Lightroom Classic — or vice versa — and need a one-keystroke handoff between the two apps.

## Requirements

- **Adobe Lightroom Classic** — cloud Lightroom is not supported (it has no AppleScript interface)
- **Photo Mechanic Plus** or **Photo Mechanic 6**

## Permissions

On first run, macOS will prompt Raycast to control three apps:

- **Adobe Lightroom Classic** — to bring it forward before triggering Show in Finder
- **System Events** — to send the ⌘R (Show in Finder) keystroke
- **Finder** — to read the revealed file path

Approve all three. They are a one-time grant and can be reviewed under **System Settings → Privacy & Security → Automation**.

## Preferences

| Setting | Default | Description |
|---|---|---|
| Show in Finder Delay | `0.7` | Seconds to wait after ⌘R before reading the Finder selection. Increase to `1.0`+ if your catalog is on a slow network drive. |
