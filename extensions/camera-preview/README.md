# Camera Preview

A simple extension that shows your webcam feed in a full-screen window, so you can check how you
look before joining a call. The image is mirrored by default, which feels natural for a
selfie-style preview.

## Usage

Run the **Preview Camera** command. Raycast closes and the preview opens on your main screen.

If you have more than one camera, **Select Default Camera** lists the connected ones so you can
pick which the preview starts with. Cameras are remembered by their unique ID, and if the chosen
one is unplugged the preview falls back to the first available camera.

- **Esc / Q** — close the preview
- **← / →** (or space) — switch cameras; the current camera name is shown at the bottom
- **↑ / ↓** — resize between small, medium, large, and full screen on the fly
- **+ / −** — zoom in on the centre of the frame, up to 3×; **0** resets it
- **M** — flip the mirroring without leaving the preview
- **S** — save a snapshot
- **R** — start or stop recording
- **Click** — closes the preview in full-screen mode

Snapshots and recordings go to the folder set in **Save Location**, named after the time they were
taken. They are written the way the preview looks, mirroring and zoom included — note that text
comes out reversed while the image is mirrored, so press **M** first if you want it readable.

## Preferences

- **Camera** — start with the built-in camera, an external one, or an iPhone via Continuity
  Camera. Leave it on *Selected Camera* to use whatever you picked with the **Select Default
  Camera** command; that command is the only way to choose between two cameras of the same kind
- **Window Size** — the size the preview opens at: Full Screen (default), Large, Medium, or Small.
  The smaller sizes open a floating 16:9 window that stays above other windows and can be dragged
  wherever you like, which is handy for keeping an eye on yourself during a call. You can also
  change size while the preview is open with ↑ / ↓
- **Save Location** — where snapshots and recordings are written. Defaults to your Downloads folder
- **Mirror the image horizontally** (on by default)
- **Fill the screen** (off by default; when off, the whole frame is fitted with black bars)

## Camera permission

macOS grants camera access to the app that launched the process, so Raycast itself needs the
permission. The first run shows the system prompt. If you denied it earlier, enable **Raycast**
under System Settings › Privacy & Security › Camera.

## How it works

Updating an image in a Raycast `Detail` view flickers badly, because every frame has to be decoded
again. Instead, this extension uses a small native window written in Swift: `AVCaptureVideoPreviewLayer`
renders the feed through the standard macOS video path, which stays perfectly smooth.

The Swift code lives in `swift/` and is built by `ray build` through
[extensions-swift-tools](https://github.com/raycast/extensions-swift-tools). It requires Xcode 16.3
or later to build, but not to run.
