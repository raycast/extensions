# Google Tasks

Manage Google Tasks from Raycast.

## Raycast AI

Use `@google-tasks` in AI Chat to search and manage tasks. Sign in through View Tasks first.

## Setup

Google Tasks needs an OAuth Client ID from your own Google Cloud project. Open **View Tasks** and the extension walks you through these steps one at a time, adjusted for personal or work accounts:

1. [Create a Google Cloud project](https://console.cloud.google.com/projectcreate), or select an existing one.
2. [Enable the Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com).
3. [Set up the consent screen](https://console.cloud.google.com/auth/overview) with an app name and your email. Choose **Internal** for a Google Workspace (work or school) account, or **External** for a personal Gmail account.
4. **External only:** under [Audience](https://console.cloud.google.com/auth/audience), choose **Publish app**. Apps left in **Testing** need your account as a test user, and Google asks you to sign in again every 7 days.
5. [Create an OAuth client](https://console.cloud.google.com/auth/clients/create) with application type **iOS** and Bundle ID `com.raycast`.
6. Paste the Client ID (ending in `.apps.googleusercontent.com`) into the last step of the guide, or into the extension preferences. It is not an API key or client secret.

With **External**, Google shows an "unverified app" warning. Choose **Advanced**, then continue.
