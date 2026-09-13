# Moodle for Raycast

Connect [Moodle](https://moodle.org) directly to [Raycast](https://raycast.com). Browse and download course files, manage upcoming assignments, sync deadlines to your Apple Calendar with 1-click reminders, check notifications, and jump straight to your Moodle dashboard.

---

## ✨ Features

- 📂 **Browse Courses & Files (`browse-courses`)**:
  - View all your enrolled courses and completion progress.
  - Drill down into sections (Lectures, Labs, Tutorials, Readings).
  - Search files by name, type, or section.
  - Download course slides, PDFs, notes, and archives with one click.
  - Automatically saves to your designated folder (organized by course) and reveals in Finder.

- ⏰ **Upcoming Deadlines & Assignments (`upcoming-assignments`)**:
  - Chronological list of upcoming assignments across all enrolled courses.
  - Live countdowns (*Due tomorrow*, *Due in 3 days*, *Overdue by 12h*).
  - Detailed side pane with instructor instructions and due dates.
  - **1-Click Add to macOS Calendar**: Adds the deadline directly into your macOS Calendar (with a 24-hour reminder alarm and submission link).
  - Filter by *Upcoming*, *Due this week*, or *Overdue*.

- 🔔 **Notifications & Announcements (`notifications`)**:
  - View course announcements and recent notifications from professors and peers.
  - Formatted markdown preview with sender details and context.
  - Mark notifications as read directly from Raycast.
  - Jump directly to the linked Moodle discussion or forum thread.

- 🚀 **Quick Open Moodle (`quick-links`)**:
  - Instant shortcuts to Dashboard (`/my`), My Courses, Calendar, and Grades Overview.
  - Direct quick-links to jump into any of your enrolled course homepages.

---

## 🔑 Setup & Authentication

To connect Raycast to your Moodle instance, you need your **Moodle URL** and your **Web Service Token**.

### 1. Finding Your Moodle URL
This is the URL you use to access Moodle in your browser, e.g.:
```
https://moodle.your-university.edu
```

### 2. Authentication: API Token or MoodleSession Cookie

The extension supports two authentication methods depending on your institution's configuration:

#### Method A: Web Service Token (Standard Moodle)
If your school allows external tokens:
1. Open your Moodle website and log in.
2. Click your **profile icon / name** in the top-right corner → **Preferences**.
3. Under the **User account** section, click **Security keys**.
4. Copy the token labeled **Moodle mobile web service** (or your custom token) and paste it into Raycast.

#### Method B: Browser `MoodleSession` Cookie (For SSO Logins)
If your school uses **SSO** (Single Sign-On with Google, Microsoft, Okta, etc.) and has external tokens disabled:
1. Open your Moodle portal in your browser (Chrome, Arc, Safari, Firefox, or Brave) where you are logged in.
2. Press **`⌥ ⌘ I`** (Option + Command + I) to open Developer Tools (or right-click and choose **Inspect**).
3. Go to the **Application** tab (Chrome/Arc) or **Storage** tab (Safari/Firefox).
4. In the left sidebar, expand **Cookies** → click your Moodle domain.
5. Find the cookie named **`MoodleSession`** and copy its **Value**.
6. Paste this value directly into the **Token or MoodleSession Cookie** field in Raycast.

---

## ⚙️ Configuration & Preferences

In Raycast, press `⌘` + `,` while inside any Moodle command, or go to **Raycast Settings → Extensions → Moodle**:

| Preference | Description | Required | Default |
| :--- | :--- | :---: | :--- |
| **Moodle URL** | Base URL of your Moodle instance | **Yes** | — |
| **Web Service Token** | Your Moodle API security token | **Yes** | — |
| **Download Directory** | Destination folder for downloaded files | No | `~/Downloads/Moodle` |
| **macOS Calendar Name** | Name of calendar to insert deadlines into | No | Default Calendar |

---

## 🛠️ Development & Building

Install dependencies:
```bash
npm install
```

Run in development mode (hot reload in Raycast):
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Lint and format code:
```bash
npm run lint
```
