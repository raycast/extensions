# Cluely for Raycast

Browse meeting notes using [Cluely's official CLI](https://github.com/cluely/cluely-cli). This is an independent Raycast extension, not a Cluely product.

- **Browse Meetings:** recent sessions, date and state filters, title/tag search across loaded results, and explicit pagination.
- **Preview Meeting:** switch between the summary and timestamped transcript, then copy either to the clipboard.
- **Check Cluely Connection:** verify both the CLI sign-in and a live read of the account.

The extension only reads sessions. It does not record meetings, edit notes, add tags, delete data, start a daemon, or expose an undocumented session deep link. The dashboard opens only when you select its explicit action.

## Set up

Install the official CLI and sign in:

```sh
brew tap cluely/tap
brew install cluely
cluely auth login
```

The official CLI handles browser sign-in and stores credentials in macOS Keychain. Existing desktop-app sign-in does not establish CLI sign-in. Run **Check Cluely Connection** after authenticating.

Common Homebrew and local installation paths are detected. If you used a manual download, enter the full executable path under **Cluely CLI Path** in this extension's preferences. The extension never reads or stores the token itself.

## Search scope

Date/state filters run through Cluely's service. Text search matches titles and tags only in meetings already loaded into the current view. Use **Load More Meetings** to include older pages. Transcript text is fetched only after selecting a meeting; it is not used in list search.

## Development

```sh
npm install
npm run typecheck
npm test
npm run lint
npm run build
npm run dev
```

Source references: [official CLI README](https://github.com/cluely/cluely-cli), [list response and filters](https://github.com/cluely/cluely-cli/blob/main/cmd/sessions_list.go), [detail response](https://github.com/cluely/cluely-cli/blob/main/cmd/sessions_get.go), [official dashboard origin](https://github.com/cluely/cluely-cli/blob/main/internal/config/config.go).

