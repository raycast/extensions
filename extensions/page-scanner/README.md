# Page Scanner for Raycast

Scan the tab in front of your browser from Raycast: **Scan Current Tab** saves it as a vector PDF
(or a PNG or JPEG) and copies the file. It works through the Page Scanner Chrome extension, like
the CLI and the MCP server do, and carries the CLI inside it, so there is nothing else to install.
macOS only.

## Commands

| Command                 | What it does                                                                    |
| ----------------------- | ------------------------------------------------------------------------------- |
| **Scan Current Tab**    | Scans the front window's active tab, saves it, then copies it (or as set below) |
| **Set Up Page Scanner** | Installs the helper and waits for Connect in the extension, checking as it goes |

Preferences (Raycast Settings, Extensions, Page Scanner):

| Preference     | Choices                                                                         |
| -------------- | ------------------------------------------------------------------------------- |
| Save To        | a folder; Downloads when empty                                                  |
| File Name      | a template: `{host}`, `{name}`, `{date}`, `{time}`, `{ext}`; `/` makes a folder |
| Format         | PDF, PNG, JPEG                                                                  |
| Page Size      | A4, US Letter, one long page                                                    |
| Markdown       | none, a `.md` beside the file, or only the `.md`                                |
| Theme          | as in Page Scanner's settings, the browser's, light, dark                       |
| Page Width     | as in Page Scanner's settings, the window's, A4, US Letter                      |
| Hide Clutter   | as in Page Scanner's settings, all of it, none of it                            |
| After Scanning | copy the file, show it in Finder, open it, open the capture in the editor       |
| Browser        | a connected browser's label or id, when more than one is connected              |

"As in Page Scanner's settings" leaves the choice to the extension's Capture settings. The
editor's own output (padding and frame, stamp, brand and watermark, PDF/A, text recognition, the
integrity record, a crop, marks) is not applied to a scan from Raycast; open the capture in the
editor to add any of it.

## Setting it up

1. Install [Page Scanner](https://chromewebstore.google.com/detail/page-scanner/oinkohacnbkapdnnhpidmoidmidlgaoj)
   1.3.0 or newer in Chrome, Edge, Brave, Arc or Vivaldi.
2. In Raycast, run **Set Up Page Scanner** and press **Install Helper**.
3. In the extension's settings (the gear in its popup), **Local agents**, press **Connect** and
   allow what Chrome asks.

The helper is the same one `npx @page-scanner/cli install` sets up, so a machine that already has
it skips step 2.

Running a command from outside Raycast (`open raycast://extensions/page-scanner/page-scanner/...`) makes
Raycast ask first; run it from Raycast's search instead.
