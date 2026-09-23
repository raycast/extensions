# ShowMD for Raycast

Read and edit markdown in your browser, straight from Raycast.

Open files and folders, return to recent documents, browse your installed agent
skills, and manage running ShowMD sessions and their open folders. ShowMD runs entirely on
localhost, so your files never leave your machine.

## How it differs from other markdown extensions

ShowMD is not a note, task, or web-clipping app inside Raycast, and it does
not prescribe a vault, frontmatter, or publishing workflow. It is a companion
to [ShowMD](https://github.com/l0kyurue1/showmd), which runs on your machine:
Raycast finds, launches, and manages ShowMD, while reading and editing happen
in your browser with a rendered Read Mode, a CodeMirror editor, and built-in
offline version history. It opens your existing folders and `.md` or
`.markdown` files in place, and needs no account or sign-in.

## Commands

- **Open**: browse ShowMD's recent files, or choose a folder or markdown file
  with a native dialog. A folder must contain a markdown file within 3 levels
  of subdirectories. ShowMD adds the target to a running session when
  possible, or starts a new one.
- **Manage ShowMD**: see every running ShowMD session and its open folders.
  Open, restart, or stop a session; stop them all; or start ShowMD when it is
  not running.
- **Edit Settings**: edit ShowMD's settings (color mode, open mode, font family and size, browser, port, update check) from a form.
- **Browse Agent Skills**: open ShowMD's Skills page, starting `showmd skills`
  if needed.
- **Open Selected**: open the markdown file or folder currently selected in Finder or Explorer.
- **Menu Bar** (macOS only): see running ShowMD sessions and their open folders, open recent
  documents, and start or stop ShowMD from the menu bar.

Every command with a Raycast view (Open, Manage ShowMD, Edit Settings) carries
a "Star on GitHub" action; report an issue or request a feature through
Raycast's own Extension Feedback section on the same action panel. The Menu
Bar's dropdown, which has no such native section, keeps all three: Report
Bug, Request Feature, and Star on GitHub.

## AI Extension tools

This extension exposes three tools an AI assistant can call directly:
`open-document` (open a file or folder by path), `list-recents` (list
recently viewed files), and `server-status` (report whether ShowMD is
running, what its first session is showing, and count how many are running).

## Requirements

For the fastest launches, install ShowMD and make it available on `PATH`, or
select its executable in the ShowMD Path preference. See the
[showmd README](https://github.com/l0kyurue1/showmd#install) for npm and
Homebrew installation options. If no installed copy is found, the extension
falls back to `npx -y showmd-cli`, which is slower on its first run.

## Preferences

- **ShowMD Path**: path to the showmd binary. Leave empty to auto-detect on PATH.
- **Port**: preferred port to check first. ShowMD running on other ports is also found.
- **Open in Running ShowMD**: add files and folders to a running ShowMD instead of starting a new one.

## Deeplinks and quicklinks

Every Raycast command has a deeplink of the form
`raycast://extensions/<author>/showmd/<command-name>`, for example:

```
raycast://extensions/l0kyurue1/showmd/open
```

Open **Create Quicklink** in Raycast to pin any command's deeplink under its
own name and icon in root search.

## Development

```
npm install
npm run dev
```

Run `npm test` for the unit test suite (no Raycast runtime required), `npm run lint` and `npm run build` before submitting changes.

The Raycast Store listing mirrors this folder. Report issues and open pull
requests in this repo, not on `raycast/extensions`.
