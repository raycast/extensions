# Microsoft Teams Keys

Microsoft Teams from the keyboard, without a Microsoft sign-in or an app your IT has to approve. Open chats, type
or send messages, control your meeting, set your status and join meetings in the Teams desktop app. Everything runs
locally on your Mac.

Microsoft Teams Keys is not made by or affiliated with Microsoft.

## Commands

| Command | What it does |
| --- | --- |
| **Open Teams Chat** | Opens the chat with a person and types an optional message, left as a draft or sent (preference) |
| **Send Teams Message** | Opens the chat and sends the message right away |
| **Teams Contacts** | Short names for the people you message most – chat, message, call or video call them |
| **Control Teams Meeting** | Microphone, camera, raise hand, share content, admit from lobby, leave call and your status in one list |
| **Toggle Teams Microphone / Camera** | Mute or unmute, camera on or off |
| **Raise or Lower Hand in Teams** | Raise or lower your hand |
| **Leave Teams Call** | Hang up |
| **Share Screen in Teams** | Opens *Share content* (`⌘⇧E`); you pick the screen or window, Teams stays in front |
| **Admit from Teams Lobby** | Lets in the people waiting in the lobby |
| **Set Teams Status** | Available, Busy, Do Not Disturb, Be Right Back, Away or Offline |
| **Set Teams Status to …** | One command per status, so each can have its own hotkey |
| **Start Teams Call** | Audio or video call; Teams asks once more before it dials |
| **Teams Meetings** | Your Teams meetings for the next seven days, from the Calendar app – join with Return |
| **Join Next Teams Meeting** | Joins the meeting that is running or starts within 15 minutes |
| **Join Teams Meeting** | Pick the meeting to join – running and starting soon first, then later today and tomorrow; also takes a link from the clipboard or the search bar |
| **Join Teams Meeting from Link** | Opens a meeting link from the argument or the clipboard in the app, Outlook Safe Links included |
| **Schedule Teams Meeting** | Fills in the Teams new meeting form with subject, attendees, start and duration |

Give the commands you use most a hotkey: select the command in Raycast, press `⌘K` → **Configure Command**.
Toggle Teams Microphone on a hotkey is a mute button that works no matter which app is in front.

## Who You Can Write To

Open Teams Chat, Send Teams Message and Start Teams Call take an email address, a contact saved in
**Teams Contacts** (by its short name), or any other name, which is typed into the Teams search and the first result
is opened (chats only, can be turned off).

## How It Works

- **Chats, calls, joining and scheduling meetings** use Teams links (`msteams:`), the same ones the "Open in app"
  buttons use.
- **Meeting controls** use the official Teams shortcuts (`⌘⇧M`, `⌘⇧O`, `⌘⇧K`, `⌘⇧E`, `⌘⇧Y`, `⌘⇧H`). Shortcuts only reach
  the app in front, so Teams comes forward for a moment and your previous app comes back right after.
- **Status** uses the Teams slash commands in the language of your Teams app (`/busy` in English, `/beschäftigt` in
  German). Set **Teams Language** if it differs from the macOS language.
- **Upcoming meetings** come from the macOS calendar, so your work account has to be added to the Calendar app.

Raycast needs the **Accessibility** permission for the keystrokes and the **Calendars** permission for the meeting
commands; macOS asks the first time. Background blur and reactions are not available: Microsoft switched off the
local Teams API that offered them, and Teams has no keyboard shortcut for them.

Two speeds in the extension preferences set how long the commands wait for Teams: **Meeting Shortcut Timing** for
the meeting controls, which usually work at *Fast* or quicker, and **Search Timing** for chats, messages and status,
which go through the Teams search. Pick *Slow* if Teams misses a keystroke, or set a *Custom Factor*. The extension makes no network requests of
its own.
