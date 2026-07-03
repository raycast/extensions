# Capture & Create

A [Raycast](https://raycast.com) extension that lets you select any region of your screen and instantly turn it into a **Google Task** or **macOS Calendar event** — powered by Claude Vision.

## Commands

### Capture to Task
Draws a selection rectangle, sends the screenshot to Claude, and creates a Google Task with an inferred title, context note, and optional due date. Requires Google OAuth (see Setup).

### Capture to Calendar
Draws a selection rectangle, sends the screenshot to Claude, and creates an event in your macOS Calendar. Works with any calendar synced to Calendar.app (iCloud, Google, Exchange, etc.) — no additional OAuth needed. You can set a default calendar in Extension Preferences and optionally override it per-invocation when triggering the command.

## Setup

### Prerequisites
- macOS with [Raycast](https://raycast.com) installed
- An [Anthropic API key](https://console.anthropic.com)
- A Google Cloud OAuth 2.0 client (for the Tasks command — see below)

### Installation
```bash
git clone https://github.com/BSoDium/raycast-capture-and-create
cd raycast-capture-and-create
npm install
npm run dev
```

Then open Raycast, search for either command, and fill in the Extension Preferences.

### Extension Preferences

| Preference | Required | Description |
|---|---|---|
| Anthropic API Key | Yes | Your `sk-ant-…` key from [console.anthropic.com](https://console.anthropic.com) |
| Default Calendar | Yes | Name of the Calendar.app calendar to use (must match exactly) |
| Google OAuth Client ID | Yes | From GCP Console — Web application type |
| Google OAuth Client Secret | Yes | From the same GCP credentials page |

### Google OAuth setup (for Capture to Task)

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID — type: **Web application**
3. Add this exact redirect URI: `https://raycast.com/redirect?packageName=Extension`
4. Enable the **Google Tasks API** for your project
5. Copy the Client ID and Client Secret into Extension Preferences

On first run, the command will open a browser to complete the OAuth flow.

## Privacy

Screenshots are sent to the Anthropic API for analysis and immediately deleted from disk. No data is stored by this extension beyond what Raycast persists locally (OAuth tokens in Keychain, preferences).

## Security considerations

**AppleScript execution (Capture to Calendar).** Event data (title, location, description, calendar name) is passed to `osascript` as `argv` values, never interpolated into script source text — this closes off AppleScript/shell injection regardless of what a screenshot or the calendar name argument contains.

**Prompt injection via screenshot content.** Screenshots are analyzed by a vision-capable LLM (Claude). Like any tool that feeds untrusted visual content to an LLM, this extension is potentially susceptible to *prompt injection* — an adversarial screenshot (e.g. a poisoned webpage, email, or image containing hidden/faint text addressed to an AI) could attempt to manipulate Claude's output, for example fabricating a misleading task title, a fake deadline, or a misleading link in the description.

This is a known, unsolved class of risk for any tool that summarizes untrusted content with an LLM. Mitigations in place:
- The extraction prompt explicitly instructs Claude to treat all visible image text as untrusted content to summarize, never as instructions to follow.
- Extracted fields are length-capped and stripped of control/invisible characters before use.
- Extracted data can never execute code — Calendar events are created via safe `argv` passing (see above) and Google Tasks via a JSON API request body.
- **Nothing is created without your explicit confirmation.** Always check the confirmation dialog against what you actually screenshotted — especially unfamiliar links, dates, or wording in the location/description/notes — before accepting.

If you screenshot content from a source you don't fully trust, treat the extracted title/notes/description with the same scrutiny you'd give any content from that source.
