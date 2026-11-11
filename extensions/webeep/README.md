# WeBeep for Raycast

Browse your [WeBeep](https://webeep.polimi.it) (the Moodle platform of Politecnico di Milano) courses directly from Raycast: course materials, lecture recordings, announcements, notifications and deadlines.

## Commands

| Command | Description |
|---|---|
| **Search Courses** | Browse your enrolled courses (in progress, past, favourites) and drill into sections, folders, files and links |
| **Search Materials** | Search every downloadable file across all courses in progress, filter by course, download or open it |
| **Open Recordings** | Jump to the lecture recording archive or the virtual classroom of each course in progress |
| **Read Announcements** | Latest posts from the announcements forums of your courses, with the full text in the detail pane |
| **Read Notifications** | Your WeBeep notifications (new content, forum posts, deadlines), with mark-all-as-read |
| **Show Upcoming Events** | Calendar events and assignment deadlines grouped by day, week and month |
| **Search Course Catalog** | Search all WeBeep courses, including the ones you are not enrolled in |

## Setup

WeBeep uses the Politecnico single sign-on (with two-factor authentication), so the extension cannot log in with a username and password and cannot renew a browser session by itself. Instead it reuses your browser session **once** to obtain a long-lived Moodle web service token:

1. Log in to [webeep.polimi.it](https://webeep.polimi.it) in your browser.
2. Copy the value of the `MoodleSession` cookie:
   - **Chrome / Arc / Edge**: developer tools (`⌥⌘I`) → **Application** → **Cookies** → `https://webeep.polimi.it` → double-click the *Value* of `MoodleSession` and copy it.
   - **Safari**: enable the Develop menu (Settings → Advanced), then Develop → **Show Web Inspector** → **Storage** → **Cookies** → `webeep.polimi.it`.
   - **Firefox**: developer tools (`⌥⌘I`) → **Storage** → **Cookies**.
   - Any browser: paste `javascript:prompt("MoodleSession", document.cookie.match(/MoodleSession=([^;]+)/)[1])` in the address bar of the WeBeep tab and copy the value from the prompt.
3. Open any WeBeep command in Raycast and paste the value in the **MoodleSession Cookie** preference. Pasting `MoodleSession=value` or the whole cookie string also works.

The cookie is exchanged once for a Moodle mobile web service token, cached locally, that stays valid for about three months regardless of the browser session. When it expires the commands show a *WeBeep login required* message: repeat the steps above with a fresh cookie.

### Preferences

| Preference | Description |
|---|---|
| **MoodleSession Cookie** | Browser session cookie, exchanged once for a long-lived token |
| **Content Language** | Language used for bilingual course names and resource titles (English or Italian) |
| **Download Directory** | Folder where course files are saved (defaults to `~/Downloads`) |

## How it works

WeBeep runs Moodle 4.5 with the mobile web service enabled. The extension:

- exchanges the browser session cookie for a token through `admin/tool/mobile/launch.php`, the same endpoint used by the official Moodle mobile app, reading the `moodlemobile://token=…` redirect instead of following it;
- calls the Moodle REST web services (`webservice/rest/server.php`) for courses, course contents, forums, notifications, calendar events and the site-wide course search;
- downloads files from `webservice/pluginfile.php` using the token, and opens them in the browser through the regular `pluginfile.php` URL so your browser session is used and the token never leaves the extension;
- resolves Moodle multi-language tags (`{mlang it}…{mlang}{mlang en}…{mlang}`) that WeBeep leaves in course and resource names.

Recording archives are detected by name (*registrazioni* / *recording*) or by their Polimi service URL; virtual classrooms by their Webex, Zoom, Teams or Meet URL.

## Requirements

- macOS
- A Politecnico di Milano account with access to WeBeep
