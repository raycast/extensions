# Spark Mail for Raycast

Your Spark inbox, a keystroke away.

Browse, search, read, and triage your [Spark](https://sparkmailapp.com/) email without ever leaving Raycast. No window-switching, no waiting for the app to focus — just open Raycast, start typing, and you're in your mail.

Under the hood it drives the official **Spark CLI**, which talks to your running Spark Desktop app over IPC. So everything you see is your real, live mailbox.

## What you can do

| Command             | What it does                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inbox**           | Browse your unified inbox with smart views — Unread, Has Attachment, New Senders, Priority, People, Newsletters, and more. Scroll to the bottom to load older mail. |
| **Search Mail**     | Hybrid keyword **and** semantic search across everything, with a full thread reader built in.                                                                       |
| **Calendar**        | Your agenda for today, tomorrow, or the week ahead.                                                                                                                 |
| **Search Contacts** | Find anyone by name or email, then jump straight to their messages.                                                                                                 |
| **Browse Folders**  | Walk through every folder and label, then drill into the mail inside.                                                                                               |
| **Compose Email**   | Start a new draft in Spark without breaking your flow.                                                                                                              |

## Before you start

You'll need three things in place:

1. **Spark Desktop** — installed and running. The CLI is just a thin client; if the app isn't open, there's nothing for it to talk to.
2. **The Spark CLI** (`spark`) — set it up in **Spark Desktop → Settings → AI Agents → Spark CLI Setup**.
3. **The path** (only if it's somewhere unusual) — if the `spark` binary doesn't live in a standard location, drop its absolute path into this extension's **Spark CLI Path** preference. Run `which spark` in a terminal to find it.

## A note on access levels

Spark lets you set an access level per account, over in **Spark Desktop → Settings → AI Agents**:

- **Read** — list, search, and read your mail, calendar, contacts, and folders. Everything except sending.
- **Triage** _(Spark Premium)_ — adds the write stuff: drafting, archiving, pinning, marking as read, and so on.
- **Send** — everything in Triage, plus sending and scheduling drafts.

The levels are cumulative, so this extension treats **Triage and above** as write-capable: **write actions are hidden automatically for any account that only has Read access**, and you never see a button that's going to fail. The read-only side works on any plan, no Premium required.

## Good to know

- The CLI can't run inside a sandbox, and it needs Spark Desktop alive on the same machine.
- Attachments download on demand into Spark's local cache and open with whatever app you'd normally use for them.

## Credits

Based on the `spark-mail` extension by **Vir Khanna** ([@v-khanna](https://github.com/v-khanna)), proposed in [raycast/extensions#28483](https://github.com/raycast/extensions/pull/28483) and closed unmerged for inactivity on 2026-07-31. Reused under the MIT license with thanks.

---

Not affiliated with or endorsed by Readdle. Spark is a trademark of its respective owner.
