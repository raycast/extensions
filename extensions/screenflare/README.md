# Screenflare for Raycast

An unofficial integration for the Screenflare macOS app.

Capture screenshots, recognize text, control recordings, and return to editable projects without hunting through menus. Includes a searchable **All in One** panel and 15 individual commands you can assign aliases or hotkeys to.

## Requirements and setup

- [Screenflare](https://screenflare.app) installed on an Apple silicon Mac running macOS 15 or newer. The integration targets the native menu layout and language resources in **Screenflare 0.1.24**.
- Raycast installed, with **Raycast** enabled in **System Settings → Privacy & Security → Accessibility**.
- If macOS requests Automation access, allow **Raycast → System Events**. This lets the extension invoke Screenflare’s menu items.
- Complete Screenflare’s initial setup. Grant **Screenflare** Screen & System Audio Recording access for captures. Optional microphone and camera access remain managed by Screenflare.

This integration uses native menu automation. Screenflare’s registered URL scheme is for authentication; this extension does not assume CleanShot-style capture URLs exist. Menu labels are read from the installed application’s translations, so English, Simplified Chinese, French, Spanish, and Japanese labels can be matched without hard-coded hotkeys. Custom Screenflare shortcuts do not affect the integration.

## Install and use

Install **Screenflare** from the Raycast Store once this submission is approved. Install the Screenflare app separately and complete the permissions above.

### Develop locally

```sh
npm ci
npm run dev
```

Find **All in One** in Raycast. `npm run dev` registers the local extension and watches changes. Configure individual aliases and hotkeys in **Raycast Settings → Extensions → Screenflare**. Less common recording controls, the image editor, and settings start disabled; enable them there as needed.

Inside **All in One**, select an action and press **⌘⇧P**, or choose **Pin Action** from its Actions menu. Pinned actions appear once in a **Pinned** section at the top and stay pinned when you reopen the panel. Use the same shortcut or **Unpin Action** to return an item to its original group. Pin preferences are stored locally in Raycast.

## Commands

| Command                            | Behavior                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| All in One                         | Search actions grouped into Capture, Recording, and Library & Settings; Chinese search keywords included |
| Record or Capture                  | Open Screenflare’s capture bar                                                                           |
| Capture Area / Window / Fullscreen | Invoke the corresponding native screenshot mode                                                          |
| Scrolling Capture                  | Open the scrolling selector; follow Screenflare’s controls to start and finish                           |
| Capture Text (OCR)                 | Select an area or window for on-device recognition and copying                                           |
| Record Display / Window / Area     | Open the corresponding recording selector; choose sources and confirm in Screenflare                     |
| Pause or Resume Recording          | Invoke whichever native action is currently enabled                                                      |
| Stop Recording                     | Stop an active recording; Screenflare saves it and opens its editor                                      |
| Open Screenshot History            | Open Screenflare’s editable screenshot history                                                           |
| Open Recording History             | Open Screenflare’s recording project history                                                             |
| Open Image Editor                  | Open an empty editor; paste or drop an image to annotate                                                 |
| Open Settings                      | Open Screenflare’s settings                                                                              |

Raycast closes before menu invocation so it is out of the capture. Screenflare controls capture output, clipboard behavior, recording countdowns, annotations, and export. The extension does not override those settings or upload anything. Opening a recording selector is not an assertion that recording has started.

CleanShot X features such as cloud uploads, previous-area capture, and recording resolution presets are not exposed here because no equivalent automation interface has been verified in Screenflare. Pinning remains available in Screenflare’s screenshot preview.

## Troubleshooting

- **Allow Raycast to control Screenflare:** enable Accessibility for Raycast and allow System Events under Automation. Relaunch Raycast if permissions were just changed.
- **Action unavailable right now:** Screenflare has disabled that menu item. Recording controls require an active recording. Finish another capture or close a modal dialog before trying again.
- **Menu unavailable:** finish initial setup, close modal dialogs, and confirm Screenflare’s version. A future menu or translation change may need an extension update.
- **Nothing captured:** allow Screenflare’s own recording permission, then use its offered restart action. See the [official troubleshooting guide](https://screenflare.app/docs/troubleshooting).

## Development and verification

```sh
npm run build
npm run typecheck
npm run lint
npm test
SCREENFLARE_TEST_APP=/Applications/Screenflare.app npm test
```

The optional environment variable checks every action’s translation keys against the installed application. Tests also check damaged locale handling, error recovery, command entry points, and AppleScript compilation. These checks do not prove capture or recording behavior; those require a live Raycast session with the permissions above. See [VALIDATION.md](VALIDATION.md) for observed results.

The extension uses a custom amber capture-frame and flare icon on a dark tile. The high-resolution source and generation prompt are preserved in [design/icon.md](design/icon.md).

Inspired by the command-oriented interaction of [Raycast’s CleanShot X extension at c33bf4c](https://github.com/raycast/extensions/tree/c33bf4cb4b9ad70c2b93432ee713ffb7486ed331/extensions/cleanshotx). This implementation is specific to Screenflare’s native menus.
