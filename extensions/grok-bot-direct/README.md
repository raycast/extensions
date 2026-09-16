# Grok Bot for Raycast

An unofficial macOS Raycast extension for your existing Grok Bot teammates. Sign
in with Cursor, browse each bot's conversation and reply threads, and read chat
history with Markdown, code blocks, tables, and LaTeX formatting.

**Experimental integration:** this client uses Grok Bot's undocumented desktop
protocol, observed in version 0.43.0. It is not affiliated with xAI, SpaceXAI,
Cursor, or Raycast. Provider authorization and Raycast Store acceptance have not
been established. See [SECURITY.md](SECURITY.md) for the authentication and privacy
boundaries.

## Install locally

You need macOS, Raycast, Node.js 22 or newer, and a Cursor account with Grok Bot
access. Your existing bots must already be set up in Grok Bot.

```sh
git clone https://github.com/Jahquan/grok-bot-raycast.git
cd grok-bot-raycast
npm ci --ignore-scripts
npm run dev
```

Search Raycast for **Browse Bot Threads** or **Grok Bot**. The development command
registers the extension. Stop the terminal watcher when you finish development;
the installed command remains available.

## Sign in

Choose **Sign in with Cursor**, complete the browser flow and its final sign-in
confirmation, then return to the open Raycast command. The provider's confirmation
names **Grok Bot** because this integration uses the desktop login flow. Keep the
command open while it waits for the result. Passwords and MFA remain in the
provider's browser; Raycast stores the resulting OAuth tokens.

No xAI model API key, Tailscale connection, public tunnel, or independent relay
server is required. Logging in connects to your existing bots and their history.
Use the OAuth logout control in Raycast's extension preferences to remove the
stored session.

## Conversations and threads

1. Select a bot to open **Current Session**, a continuous transcript inside Raycast.
   It starts fresh and shows only messages from the time you entered that view.
2. Your messages and bot replies accumulate in chronological order during the visit.
   Opening the composer and returning keeps the same session. Leaving the bot and
   reopening it starts a fresh view. Nothing is deleted from the bot's saved history.
3. **Browse Previous History** explicitly opens the saved-message browser. Its
   detail pane supports full-width reading, Markdown source, files and approvals.
   **Browse Bot Threads** opens existing server-recorded reply threads.
4. In the history browser, selection stays fixed through refresh and older-page
   loading. **Jump to Latest** (Command-J) clears search and selects the latest item.
5. The main conversation API reads a recent 20-entry tail for initialization and
   polling. It does not fetch every old page. Older pages are loaded only on request;
   explicitly opening a saved reply thread uses the provider's thread endpoint.

Both your messages and bot responses use the native Markdown renderer, with
paragraphs, explicit line breaks, lists, code fences, tables, and LaTeX adaptation.
The composer accepts Markdown and has **Preview Formatting** before sending.
Code indentation and source are preserved. Raycast controls wide table/code layout
and supported mathematical rendering. There is no browser chat or local server.

## Messages and files

Write a message and submit with **Command-Enter**. Attach up to six files: 25 MB
per file, or 200 MB for supported video types. The extension validates the entire
selection before uploading and sends larger files in bounded chunks.

Host-backed attachments have a **Download File** action. Downloads use the
authenticated gateway, are written privately to the extension support directory,
and are revealed in Finder. Files are not automatically executed.

Messages can redirect a bot that is already working. **Stop Bot** requests an
interruption, with confirmation. Closing Raycast does not stop cloud work.
If delivery is uncertain, the extension does not resend automatically: inspect
history before composing a repeat.

## Questions, approvals, routines, and skills

- **Answer Question** submits a structured widget response and displays the
  server-recorded answer. Already-answered questions cannot be submitted again.
- **Review Approval** supports Auto Review **Approve Once** and **Deny**. The
  request is reread before submission so a changed request is not approved using
  stale information. No always-allow permission is granted by this interface.
- View saved routines and skills from bot actions. **Run Now** requests execution
  of the displayed saved instructions. Routines also support pause and resume.
  Instructions are rechecked before changes or execution.

## Avatars and artwork

The extension icon is original AI-assisted character artwork. The repository does
not distribute artwork extracted from the Grok Bot application.

Raster avatar data supplied by the service is preferred when available. Otherwise
bots use a colored fallback. An existing personal installation can retain its local
character SVGs under the extension support directory's `characters` folder, named
`<shape>-<color>-light.svg` and `<shape>-<color>-dark.svg`. Both variants must exist.
Those optional local files are not covered by this repository's license.

## Scope and limitations

The implemented workflow covers messaging, loaded history, reply threads, files,
questions, selected approval controls, reactions, and routine/skill actions. It is
not a complete replacement for every Grok Bot desktop feature.

Remote computer takeover, voice, arbitrary user forms, secret-entry flows,
payment-specific approvals, and specialized draft controls still require the
native app. Unsupported rich media and some non-host file URLs also hand off to
Grok Bot. Routine editing and broader bot management remain in the native app or
can be requested through a bot conversation.

The API is undocumented and can change. Store review must resolve whether this
integration and its authentication mechanism are acceptable before publication.
The Store listing is not live merely because this repository is public.

## Development and verification

```sh
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage
npm run build
npm run lint:store
```

Core tests use synthetic credentials, identifiers, messages, and generated files.
They exercise account-cache invalidation, overlapping history pages, thread
identity, Markdown/LaTeX preservation, uncertain delivery, file integrity, stale
approvals, and changed routine instructions. Coverage gates are 85% lines, 70%
branches, and 85% functions/statements. CI runs against the committed lockfile with
GitHub Actions pinned to immutable commits.

Live Raycast smoke tests have verified Cursor sign-in, existing bot discovery,
character display, message round trips, file upload and exact bot read-back,
structured question responses, and downloaded-file hash equality. Unit tests and
protocol inspection do not substitute for a live consequential approval test;
no real scheduled job or consequential approval was executed merely for testing.

Native tests cover session cutoffs and reopening, initial selection, incoming
messages, streaming updates, older-page merges, and explicit latest selection.
A live Raycast smoke check verified an empty session, a harmless message and bot
reply rendered with headings and bullets, and an empty view after reopening.
Core coverage does not measure native UI rendering.

Private account data, development research, session files, and local artwork are
excluded from the repository. If module-loading errors occur in an iCloud-backed
checkout, reinstall with `npm ci --ignore-scripts` or validate a source-identical
copy outside the synced directory; the exact filesystem cause is not established.

## Publishing

The Raycast publisher is [Supremum](https://www.raycast.com/Supremum).
`npm run lint:store` checks the Store author, icon dimensions, and metadata.
Maintainers use `ray login` and `npm run publish`, or submit a reviewed branch to
[raycast/extensions](https://github.com/raycast/extensions). Publication requires
Raycast's review and merge. Read the provider terms and clearly disclose this
client's undocumented integration in the submission.

## License

[MIT](LICENSE) for this repository's code and original release artwork. Service
names and third-party trademarks belong to their respective owners. Third-party
npm dependencies retain their own licenses.
