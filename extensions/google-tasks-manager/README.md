# Google Tasks Manager

View, create, and manage your Google Tasks directly from Raycast.

## Features

- Browse all your task lists and tasks
- Filter tasks by status: Open, Completed, or All
- Create tasks with title, notes, and due date
- Natural language due dates in 6 languages: English, French, German, Spanish, Portuguese, Italian
- Complete and reopen tasks with a single keystroke
- Edit task details inline
- Delete tasks
- Visual indicators for completed and overdue tasks

## Setup

This extension requires a Google OAuth Client ID to connect to the Google Tasks API. Follow these steps once before first use.

### 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services > Library**, search for **Google Tasks API**, and click **Enable**

### 2. Configure the OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** as the user type
3. Fill in the required fields (app name, user support email, developer email)
4. On the **Scopes** step, add the scope `https://www.googleapis.com/auth/tasks`
5. On the **Test users** step, add your Google email address
6. Complete the wizard

> **Important**: While your app is in "Testing" status, only the test users you add here will be able to authenticate. This is normal — you don't need to publish the app.

### 3. Create an OAuth Client ID

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Choose **iOS** as the application type
4. Set the **Bundle ID** to `com.raycast`
5. Click **Create** and copy the generated **Client ID**

### 4. Enter the Client ID in Raycast

1. Open Raycast and search for **View Tasks** or **Create Task**
2. On the first run, Raycast will prompt you for the OAuth Client ID in extension preferences
3. Paste your Client ID (it looks like `123456789-abcdef.apps.googleusercontent.com`)
4. A "Connect your Google account" overlay will appear — click **Connect**
5. Sign in with the Google account you added as a test user
6. Grant access — the browser redirects back to Raycast and your tasks load

## Commands

### View Tasks

Browse your task lists, then drill into any list to see its tasks. Use the dropdown filter to show open, completed, or all tasks.

| Shortcut | Action |
|----------|--------|
| `↩` | Complete / Reopen task |
| `⌘ E` | Edit task |
| `⌘ N` | Create new task in current list |
| `⌘ ⌫` | Delete task |

### Create Task

A standalone form to quickly create a task from anywhere in Raycast. Type a title, add optional notes, set a due date using natural language, then choose which task list it belongs to.

## Date Expressions

The Due Date field accepts plain text. As you type, a live preview confirms the recognized date. Supported in 6 languages:

| Language | Today | Tomorrow | In 3 days | Next Monday | Absolute date |
|----------|-------|----------|-----------|-------------|---------------|
| **English** | `today` | `tomorrow` | `in 3 days` | `next monday` | `jan 15` |
| **French** | `aujourd'hui` | `demain` | `dans 3 jours` | `lundi prochain` | `15 janvier` |
| **German** | `heute` | `morgen` | `in 3 Tagen` | `nächsten Montag` | `15 Januar` |
| **Spanish** | `hoy` | `mañana` | `en 3 días` | `el lunes` | `15 enero` |
| **Portuguese** | `hoje` | `amanhã` | — | `segunda-feira` | `15 janeiro` |
| **Italian** | `oggi` | `domani` | `in 3 giorni` | `prossimo lunedì` | `15 gennaio` |

Leave the field blank to create a task with no due date.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Invalid client_id" | Double-check the Client ID in Raycast Preferences > Extensions > Google Tasks Manager |
| "Access blocked: This app's request is invalid" | Make sure the OAuth client type is **iOS** with Bundle ID `com.raycast` |
| "Request had insufficient authentication scopes" | Log out (Preferences > Extensions > Google Tasks Manager > Logout) and reconnect |
| "Access denied" or 403 on sign-in | Add your Google email as a test user in the OAuth consent screen settings |
| Extension not appearing in Raycast | Make sure `npm run dev` is running. Check the terminal for build errors |
| Tasks not refreshing after changes | Check the `npm run dev` terminal for API errors |

## Development

```bash
npm install
npm run dev
```

Running `npm run dev` starts the Raycast development server with hot reload. See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture details.
