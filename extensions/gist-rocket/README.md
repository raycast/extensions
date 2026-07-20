# Gist Rocket

Publish HTML or Markdown as a live web page — in one keystroke.

Gist Rocket turns whatever's on your clipboard (or in a file) into a public URL you can share immediately. It's powered by GitHub Gists and the [Gisthost](https://gisthost.github.io/) service: your gist is the source of truth, but recipients just click an `https://…` link in their browser. No server to run, no deploy step.

## Commands

- **Publish Page** — Takes the HTML or Markdown on your clipboard, publishes it, copies the live URL, and (optionally) opens it. Auto-detects format; pick a title or let it derive one from the first heading.
- **Publish from File** — Pick an `.html` / `.md` file, or a folder containing `index.html`. Local `<script src="…">` and `<link rel="stylesheet" href="…">` references are inlined automatically so the page works as a single file.
- **My Pages** — Browse, open, update, rename, or delete pages you've published.

## Markdown support

Markdown is rendered to HTML at publish time using a compact GitHub-style stylesheet (inlined into the page so nothing is fetched from elsewhere). The original `.md` is stored alongside `index.html` in the gist as `source.md`, so the gist remains an editable source you can come back to.

**Themes:** **light** (default), **dark**, or **auto** (follows the viewer's system preference). Every published page also includes a small light/dark toggle in the top-right corner, so viewers can flip the theme to suit themselves; their choice is remembered per-page in `localStorage`.

**Syntax highlighting:** fenced code blocks are highlighted at publish time using highlight.js. Languages covered out of the box include JavaScript, TypeScript, Python, Go, Rust, Java, C#, C++, Swift, Kotlin, Ruby, PHP, SQL, Bash/Shell, HTML, CSS, JSON, YAML, Markdown, Objective-C, R, Dart, and PowerShell. The highlight palette flips with the theme automatically.

## Preferences

- **Host Base URL** — Where pages are served. Defaults to the public Gisthost service.
- **Default Visibility** — Secret (unlisted) or Public. Both render identically.
- **Default Markdown Theme** — Light, Dark, or Auto.
- **Auto-open after publish** — Open the URL in your browser when publishing succeeds.
- **Copy URL after publish** — Copy the URL to your clipboard when publishing succeeds.

## Notes

- "Secret" gists are unlisted, not encrypted. Anyone with the URL can view the page.
- Inline `<script>` blocks work. External `<script src="…">` works when pointed at full `https://` URLs. Local script paths are handled by the inlining step in *Publish from File*.
- Gists are flat: nested folders aren't supported. Keep assets at the top level.
