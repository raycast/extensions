# Google Classroom

Browse your Google Classroom courses, announcements, assignments, questions and materials, download their attachments and hand assignments over to Raycast AI.

## Setup

The Classroom API has to be enabled in the Google Cloud project that owns the OAuth client, so for now you need your own (free) client ID. Raycast asks for it the first time you open a command:

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/projectcreate).
2. Enable the [Google Classroom API](https://console.cloud.google.com/apis/library/classroom.googleapis.com) and the [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com).
3. Configure the [OAuth consent screen](https://console.cloud.google.com/auth/overview) and add your Google account as a test user.
4. [Create an OAuth client](https://console.cloud.google.com/auth/clients/create) with the application type **iOS** and the bundle ID `com.raycast`.
5. Paste its client ID in the **OAuth Client ID** preference.

The extension only requests read-only access. School accounts may need their administrator to allow third-party apps to access Classroom data.

## Commands

- **Show Courses:** your active and archived courses. Open one to see its announcements, assignments, questions and materials.
- **Show Assignments:** assignments across your active courses, grouped by status: Missing, Due Soon, Due Later, No Due Date and Done.

On any post you can download its attachments or the files you submitted, open them in the browser, copy its details, or send it with its attachments to Raycast AI Chat. The same data is available to Raycast AI through `@google-classroom`.

## Hiding courses that have ended

Courses often stay active long after they end. Choose **Hide from Assignments** (⇧⌘H) on a course in **Show Courses**, or **Hide Course from Assignments** on any of its assignments. Nothing is fetched for hidden courses, which also makes Show Assignments faster. They stay in Show Courses, marked as hidden, where **Show in Assignments** brings them back. The choice is kept per Google account.

## Loading and refresh

Every view opens with what it showed last time and brings it up to date in the background. Press **⌘R** (Ctrl+R on Windows), or choose **Refresh** in Actions, to fetch fresh data immediately. Leaving a view open does not poll Google.

A course or a kind of post that fails to load is listed under **Couldn't Load** at the end of the list, with the reason, while everything else is shown as usual. Downloads report the files that failed or that have no downloadable format, and can be cancelled from their toast.

## Settings

Open **Raycast Settings → Extensions → Google Classroom**, or choose **Open Extension Settings** in either command's Actions menu.

- **Group assignments by status:** switch grouping on or off in Show Assignments. Ungrouped assignments sort by most recently updated.
- **Assignment Group 1–5:** the order the groups are shown in. Repeated selections appear once; omitted groups follow in their default order.
- **Also search teacher names:** disabled by default because it fetches the rosters of your courses when searching.

In **Show Assignments**, **Hide Details** (⇧⌘I) swaps the detail panel for rows that show each assignment's course, status and due date.
