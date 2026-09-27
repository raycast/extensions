# comarkserv for Raycast

Preview markdown files and folders in the browser with [comarkserv](https://github.com/Rigo-m/comarkserv): live reload, search of pages and headings, and 580+ themes.

## Commands

- **Preview Markdown**: opens the markdown file or the folder that is selected in Finder. Each folder gets its own server, and a second preview of the same folder uses the server that runs.
- **Markdown Previews**: shows the running previews and the recent folders. You can open, copy, stop and start previews.
- **Search Markdown Themes**: searches the base16, base24 and Omarchy themes and shows their colors. You can set the default theme for new previews, or preview the Finder selection with a theme.

## Requirements

- Node.js 20.19 or later.
- comarkserv: install it with `pnpm add -g comarkserv` or `npm install -g comarkserv`. Without it, the extension uses `npx comarkserv`, and the first preview is slower.

The extension finds `comarkserv` through the PATH of your login shell. To use another command, set **comarkserv Command** in the preferences of the extension.

The servers use the same state as the comarkserv script commands, so each tool can see and stop the servers of the other.
