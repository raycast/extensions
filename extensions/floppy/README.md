# Floppy

[Floppy](https://fpy.sh) turns any file into a share link and shows who read it, page by page. This extension puts it one keystroke away in Raycast.

## Commands

- **Search Floppy**: every file on your Floppy Disk, across My files and your teams. Press Enter to copy the link. Open it, show it in Finder (with Floppy for Mac's disk mounted) or see who read it.
- **Share File**: pick files (the Finder selection is filled in) and get one fpy.sh link, copied. Type who it's for to give that person their own URL, so you see exactly what they read. Set when it expires.
- **Share Finder Selection**: the same with no window. Select files in Finder, run it, paste the link.
- **Recent Links**: your newest links with their views. The side panel shows each reader: pages reached, time spent, when, and from where. Make a separate link for one person with ⌘N.
- **Copy Last Link**: the link you made most recently, on your clipboard.
- **Ask Floppy**: ask a question about the text files on your disk (Markdown, plain text, CSV, JSON, HTML, XML, YAML). Raycast AI answers on your Raycast plan and cites the files it used. Floppy's servers run no AI for it.

In Raycast AI, `@floppy` can find a file's link, list your recent links and say who read one.

## Sign in

Run any command and sign in with your Floppy account in the browser. Raycast keeps the session; you can disconnect it at [fpy.sh/app/keys](https://fpy.sh/app/keys) or with Raycast's Log Out.

Prefer an API key? Create one at [fpy.sh/app/keys](https://fpy.sh/app/keys) and paste it in the extension's preferences. It's used instead of signing in.

## Good to know

- One file up to 100 MB uploads in one request. Bigger files, and several files at once, upload in 32 MB parts.
- A new link opens for others once its malware check passes, usually in a few seconds.
- Show in Finder and Open File need [Floppy for Mac](https://fpy.sh/mac) with Floppy Disk turned on.
- Everything uses Floppy's public API: [fpy.sh/docs/api](https://fpy.sh/docs/api).
