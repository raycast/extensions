# Leaf Calendar

A raycast extension to access Leaf Calendar with your raycast workflow.

You can see your agenda, setup scheduling links, and schedule events. You can also see all your calendars in one place

## Introduction

The extension never touches your Google account or Leaf Calendar's database. It asks Leaf Calendar over Leaf Calendar's local API, and Leaf Calendar answers with what it would show you. Edits go through Leaf Calendar, so they're synced and protected the same way as edits you make in the app.

### Prerequisites

- Windows
- Leaf Calendar running and signed in to Google
- **Settings › Connected apps › Allow other apps to connect** turned on in Leaf Calendar

## Getting Started

1. Turn on **Settings › Connected apps › Allow other apps to connect** in Leaf Calendar.
2. Run any Leaf Calendar command in Raycast.
3. Raycast shows a **Sign in with Leaf Calendar** screen. Press `Enter`, and Leaf Calendar asks whether Raycast can connect. Choose **Allow**. Raycast says you're signed in and takes you back to the command.

That's it! Leaf Calendar lists Raycast under **Settings › Connected apps**. Remove it there to cut it off.

> Leaf Calendar remembers the program that connected, which is Raycast's own copy of Node. Other Raycast extensions run in that same program, so once you allow one, the others can connect too.

## Commands

| Command | What it does |
| --- | --- |
| My Agenda | Your events from today on, grouped by day, with the selected event's details and guests in a side panel. Filter by calendar, join meetings, edit or delete events, and open them in Leaf Calendar. |
| Create Event | Add an event to any calendar you can edit: start and duration, location, Google Meet, description, and guests (type a name or email in Add Guest and Leaf Calendar suggests people you meet with and your Google contacts). |
| Join Next Meeting | Joins the meeting Leaf Calendar's join shortcut would pick. Give it a hotkey. |
| Find a Time to Meet | Your free times for the next two weeks (working hours minus busy events), cut into slots of the length you pick in the command's preferences. Add Custom Time for a time of your own. Select the ones to offer, then Copy & Save: the times go on your clipboard in your Leaf Calendar share message and stay on your calendar in Leaf Calendar. Pick a Cal.com link in the search bar to give each time its own booking link. |
| Scheduled Windows | Time windows you offered, from Find a Time to Meet or Leaf Calendar's share panel. Book one (an event with your guests, or a booking on the link) or delete them. |

## Shortcuts

| Action | Shortcut |
| --- | --- |
| Join Meeting (or Open in Leaf Calendar) / Select Time / Book a Time | `Enter` |
| Open in Leaf Calendar / Copy & Save | `Ctrl` `Enter` |
| Open in Leaf Calendar / Show Scheduled Windows | `Ctrl` `O` |
| Open Day in Leaf Calendar | `Ctrl` `Shift` `O` |
| Edit Event | `Ctrl` `E` |
| Create Event / Add Custom Time | `Ctrl` `N` |
| Delete Event / Delete Scheduled Windows | `Ctrl` `X` |
| Clear Selection | `Ctrl` `Shift` `X` |
| Copy Meeting Link | `Ctrl` `Shift` `C` |
| Copy Title | `Ctrl` `Shift` `.` |
| Show / Hide Details | `Ctrl` `Y` |
| Refresh | `Ctrl` `R` |

## Preferences

- **Agenda Length**: how many days My Agenda shows, from today. 7 by default.
- **Time Slots** (Find a Time to Meet): how long each offered time is, from 15 minutes to 2 hours, or the whole free stretch. 30 minutes by default. A booking link uses its own length.

## Documentation

- [Leaf Calendar Local API](https://github.com/artistro08/leaf-calendar/blob/main/docs/api.md)
