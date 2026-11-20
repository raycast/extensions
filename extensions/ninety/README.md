# Ninety

Work with [Ninety.io](https://www.ninety.io) — the EOS® platform — without leaving Raycast.

## Commands

- **My To-Dos** — your open To-Dos grouped by due date, or any Team's To-Dos. Complete, edit, reschedule, comment and delete.
- **Issues** — a Team's Short-Term and Long-Term Issues, newest first or by priority. Solve, move, prioritize, comment and create linked To-Dos.
- **Rocks** — your Rocks or a Team's Rocks for the current quarter, grouped into Company, Department and per-person Rocks, with Milestone progress. Set status, manage Milestones, and create linked To-Dos and Issues.
- **Headlines** — a Team's Headlines and Cascading Messages, newest or oldest first.
- **Scorecard** — a Team's weekly, monthly, quarterly or annual Measurables for any period, with goals, descriptions, notes and score history. Input scores.
- **Meetings** — each Team's Meeting happening now, its next Meeting (agenda, presenter, scribe and attendees) and recent past Meetings with notes, ratings and the Issues they solved.
- **Create To-Do / Issue / Headline / Rock** — quick-capture forms.

You can also ask Raycast AI things like `@ninety what are my open To-Dos?` or `@ninety add an Issue to Leadership about the Q1 hiring plan`. Anything that changes data asks for confirmation first, and answers link to the items in Ninety.

## Keyboard Shortcuts

The main lists share the same keys:

| Shortcut | Action                                                                                     |
| -------- | ------------------------------------------------------------------------------------------ |
| ↵        | Show or hide details                                                                       |
| ⌘ ↵      | Open the item in Ninety                                                                    |
| ⌘ ⇧ U    | Update the item: Complete To-Do, Solve Issue, Set Status, Input Score, Mark Milestone Done |
| ⌘ ⌥ S    | Change sort order (Issues and Headlines)                                                   |
| ⌘ ⇧ P    | Change period (Scorecard); use ⌘ [ and ⌘ ] for the previous and next period                |
| ⌘ N      | Create a new item                                                                          |
| ⌘ E      | Edit the item                                                                              |

## Setup

1. Open [Developer Settings in Ninety](https://app.ninety.io/settings/user/developer-settings) (or choose your name at the bottom of the left navigation, then **User Settings → Developer Settings**).
2. Select **Generate New Token**, pick an expiration and copy the token (it is only shown once).
3. Paste it into the extension's **Personal Access Token** preference.

API access requires a Ninety **Thrive** or **Legacy** plan. Observers can't create tokens. The extension can only do what your Ninety role allows, and items you create are owned by you.

### Optional Preferences

- **Your Ninety Email** — Ninety's API can't look up the signed-in user, so the extension finds you by this email. It's needed for My Rocks and for marking your own items.
- **Your Avatar URL** — Ninety's API doesn't share profile photos, so people show as initials and your items show a "ME" badge. Paste the link to your Ninety photo (right-click your avatar in Ninety, then **Copy Image Address**) to use it instead.
- **Scorecard → Show Average / Show Total** — add each Measurable's average (compared with its goal) and total to the top of its score table.

## Limitations

These come from what Ninety's public API offers today:

- Meetings in progress can't be read, so **Happening Now** is based on each Meeting's schedule, and current Meetings open the Meetings page rather than the Meeting itself.
- Measurable descriptions are only available to company Owners and Admins.
- Links open in the Team you last viewed in Ninety (except the Scorecard, which opens the right Team).
