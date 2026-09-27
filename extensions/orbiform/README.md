# Orbiform

Manage your [Orbiform](https://orbiform.cc) forms without leaving Raycast — list every form, spin up a new one with AI from a one-line description, and check response stats, all from ⌘ Space.

## Commands

**List Forms**
Shows every form in your workspace — title, response count, and creation date. Open a form in the browser or copy its public link with one keystroke.

**Create Form with AI**
Describe the form you want in plain language ("a customer feedback form with a 1–5 rating and an optional comment box") and Orbiform's AI builds the questions, publishes the form, and copies the link to your clipboard. A few quick-start prompts are included if you want a starting point.

**Form Stats**
Pick a form and see its total responses, conversion rate, and a 7-day response trend — without opening the dashboard.

## Authentication

The extension signs in with OAuth 2.0 (PKCE) — the same connection Orbiform's Claude and ChatGPT connectors already use, not a separate login system. The first time you run any command, Raycast opens your browser to your Orbiform account to approve access; after that, you're signed in.

No password is ever stored by the extension. You can see and revoke the connection at any time from **Orbiform → Settings → Team → Connected apps**, the same place MCP connections show up.

## Requirements

- A free or paid [Orbiform](https://orbiform.cc) account
- macOS (Raycast itself is macOS-only)

## Screenshots

<!--
  TODO: add screenshots here, e.g.:
  ![List Forms](metadata/orbiform-1.png)
  ![Create Form with AI](metadata/orbiform-2.png)
  ![Form Stats](metadata/orbiform-3.png)
-->

## Support

Questions or issues: [help.orbiform.cc](https://orbiform.cc/help) or reach out via the Orbiform dashboard.
