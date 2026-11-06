# Beeper Follow-Ups

Review direct conversations whose latest visible message came from your contact, read that message inside Raycast, and prepare an unsent draft in Beeper.

## What's new

- **Mark as Handled** (⌘D) hides a conversation until the other person writes again.
- Message preview pane, network filter sections and colour-coded waiting time (orange after 3 days, red after 7).
- New **Awaiting Reply Count** menu bar command.

## Why a separate package?

The official [Beeper Desktop extension](https://github.com/raycast/extensions/tree/main/extensions/beeper) already provides recent chats, contacts, unread chats, message search, account browsing, and sending. This package adds a dedicated oldest-first reply review queue. It does not replace the official extension.

## Setup

1. Keep Beeper Desktop running. Enable its Desktop API in Settings → Developers if it is not already enabled.
2. Install the dependencies and run `npm run dev` to import this local extension into Raycast.
3. Run **Review Conversations Awaiting Reply** and connect to Beeper through its local OAuth approval screen. The extension requests only the `read` scope.
4. Set your activity window to 7, 14, or 30 days in extension preferences. Muted chats are excluded by default.

Use the local URL displayed by Beeper, normally `http://localhost:23373`. The extension rejects remote URLs and URL credentials.

## Behavior

- Scans up to 200 direct conversations in the primary inbox, using official cursor pagination. Reports incomplete coverage if more conversations match or a message request fails.
- Retrieves full participant metadata for each actual conversation/member and reads up to three message pages until a visible message is found, including member chats of merged conversations, with up to four concurrent requests. Inconclusive histories or sender identities are excluded and reported in Scan Coverage.
- Ignores hidden/deleted messages, reactions, notices, and messages whose sender exactly matches a participant explicitly flagged as an automated network account. It continues reading past pages containing only ignored events. Shows a conversation only when its latest visible message explicitly has `isSender: false` and matches a listed non-self participant. Normal matching participants remain eligible when the optional bot flag is omitted. This is a review rule, not a claim that the contact requires a reply.
- Sorts conversations oldest first. Search filters chat names; the network menu filters services.
- **Read Message** shows a plain-text preview. It escapes message markup so third-party images and formatting cannot be rendered as embedded resources.
- **Open Conversation in Beeper** focuses the actual member chat and message.
- **Prepare Draft** verifies the recipient and rechecks the current Beeper draft. It refuses to overwrite existing draft text or attachments. The standard New shortcut also opens the draft form from a queue row or message preview. You review and send the draft in Beeper.

This package contains no message-send, account modification, archive, deletion, read-marking, or reminder endpoint. If the installed Beeper version requires write permission for a focus/draft operation, the operation will fail; it does not silently request broader permission.

API reads do not mark conversations read. Opening a conversation in Beeper may follow Beeper's normal read behavior. Message history is limited to what Beeper has indexed locally; conversations with more than three pages of ignored recent events are reported as inconclusive.

Sender matching uses exact IDs. Incomplete participant metadata or an unmatched incoming sender is reported as inconclusive, rather than guessed from a display name or message text. Beeper's bot flag is optional; an automated participant that Beeper does not identify as a bot cannot be distinguished from a normal participant by this rule.

## Privacy

The extension contacts only the loopback Beeper API. Message bodies are held in memory, not saved in extension storage or logs. Raycast stores the OAuth credential using its PKCE token storage. No remote AI, analytics, or chat export is used.

## Development

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:live`.

## Official references

- [Beeper Desktop API](https://developers.beeper.com/desktop-api/)
- [Beeper API reference](https://developers.beeper.com/desktop-api-reference/)
- [Official TypeScript SDK](https://github.com/beeper/desktop-api-js)
- [Raycast OAuth utilities](https://developers.raycast.com/utilities/oauth)

Author: itsdanielsultan. This is an independent local extension, not an official Beeper release.
