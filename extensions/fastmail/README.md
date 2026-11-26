# Fastmail

See your latest Fastmail emails, search your whole archive and grab login codes, right from Raycast.

> This is an unofficial extension. It isn't made by or affiliated with Fastmail.

## Commands

- **Search Email**: your latest inbox emails, or search all mail with `from:`, `subject:`, `is:unread`, `has:attachment` and more. Read, archive, delete, report spam and open attachments.
- **Copy Latest Login Code**: copies the code from the newest login email of the last 15 minutes. If the Raycast browser extension is installed, it prefers the email from the site in your current tab. Give it a hotkey in Raycast settings and it's the closest thing to autofill.
- **Login Codes**: a menu bar item that checks every minute and shows a fresh login code. Click a code to copy it, or a login link to open it.

Copied codes are marked as concealed, so clipboard history doesn't keep them.

Want codes autofilled natively in Safari? macOS only does that for Apple Mail, so you'd add your Fastmail account there. This extension is for everyone else.

## Setup

1. Open **Search Email**. It asks for a Fastmail API token.
2. Press ⌘O to open Fastmail's API token settings (Settings → Privacy & Security → API tokens) and click **New API token**.
3. Tick **Email**. Leave **Read-only** unticked if you want to archive, delete and report spam from Raycast.
4. Copy the token (it starts with `fmu1-`) and paste it into Raycast.

You can revoke the token in Fastmail at any time.

## Security and privacy

- **Straight to Fastmail.** The extension talks directly to Fastmail's official API (JMAP). There is no server in between, no account with us and no analytics.
- **Your token stays on your Mac.** It's stored in Raycast's encrypted local storage and only ever sent to Fastmail. A read-only token works if you only want to read.
- **Login codes are found locally.** Recent emails that look like login or verification emails are scanned on your Mac with pattern matching. Found codes and links are forgotten after 3 days.
- **Menu bar checks are small.** The Login Codes menu bar item asks Fastmail for the last 15 minutes of mail once a minute, only while you have it enabled.
- **Attachments don't linger.** Attachments you open are saved to a temporary folder and deleted after a day.

## Optional: Raycast AI for login codes

Pattern matching finds most codes, but some emails hide them in unusual formats. If you have Raycast Pro, you can turn on **Use Raycast AI to find login codes** in the extension preferences. It's off by default.

**How it works:** for emails from the last 3 days whose subject or preview looks like a login, sign-up or verification email, the extension sends Raycast AI the subject, the sender's address, up to 6,000 characters of the text and the email's links, and asks for the code or login link. A code is only shown if it literally appears in the email. Other emails are never sent.

**The privacy trade-off:** those emails leave your Mac and are processed by Raycast and the AI model provider it uses, under [Raycast's privacy policy](https://www.raycast.com/privacy). They contain live login codes and sign-in links, which work for a few minutes. Emails that only look like login emails, for example a personal message that mentions a "code", get sent too. If that isn't acceptable to you, leave the setting off; everything else works the same.
