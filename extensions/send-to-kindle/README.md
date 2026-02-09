# Send to Kindle (Raycast)

Send any web article to your Kindle with clean extraction, optional cover image, custom CSS filters, and a very fast email delivery mode.

## Why This Extension

This extension is built to produce clean, readable EPUB files for Kindle, even when source pages are full of ads, widgets, and noisy layout blocks.

Key strengths:

- Robust extraction powered by `@mozilla/readability`
- Advanced per-domain cleanup with custom CSS filters
- Cover image selection using CSS (`Cover CSS`)
- Extension preference to disable EPUB cover sharing
- Extension preference to remove all article links before sending
- Edit before sending (title + Markdown content)
- Two delivery methods:
  - Send to Kindle app installed on Mac
  - SMTP email delivery (recommended, faster)
- EPUB metadata optimized for reading: site name as source/author (instead of article author name)
- Send with or without preview

## Requirements

1. Raycast installed.
2. This Raycast extension installed.
3. Raycast browser extension installed and active (required to access the active tab and page HTML).
4. A Kindle account configured on Amazon.
5. If using email mode:
   - a Kindle address (`...@kindle.com`),
   - your sender email added to Amazon's approved senders list,
   - a valid SMTP server.
6. If using Gmail: use an app password (not your main Google account password).

## Installation and First Run

1. Install the extension in Raycast.
2. Run `Set / Change Sending Method`.
3. Choose your preferred mode:
   - `Email (Recommended)` for faster daily use.
   - `Send to Kindle app (Mac)` if you prefer Amazon's local app flow.
4. Save your setup.
   - In email mode, SMTP settings are validated before saving.

## Delivery Modes

### 1) Email (recommended, faster)

Email mode sends the generated EPUB directly as an attachment to your Kindle address.

Fields to configure:

- `Kindle Address` (example: `yourname@kindle.com`)
- `Sender Address` (your email)
- `SMTP Server`
- `SMTP Port` (commonly `465` for SSL/TLS)
- `SMTP Security` (`SSL/TLS`, `STARTTLS`, or `None`)
- `SMTP Username`
- `SMTP Password` (app password if using Gmail)

Benefits:

- Very fast day-to-day workflow
- No need to open the Send to Kindle desktop app
- Immediate feedback in Raycast

### 2) Send to Kindle App (Mac)

The extension generates the EPUB and opens it with the "Send to Kindle" app.

Benefits:

- No SMTP setup required

Limitations:

- Slower day-to-day flow
- Depends on Amazon's app being installed locally

## Available Commands

- `Send to Kindle`
  - Direct send (no preview).
  - Best for speed.
- `Preview and Send to Kindle`
  - Full preview of the extracted article.
  - `Edit content` action to modify title and Markdown before sending.
- `Set / Change Sending Method`
  - Configure App or Email mode.
- `Add a Skill`
  - Add a domain filter profile:
    - `CSS Filter` to remove blocks (ads, sidebars, popups, etc.)
    - `Cover CSS` to select the cover image
- `My Skills`
  - Manage filters (edit/delete)
  - Export a filter profile as JSON

## Extension Preferences

In Raycast (Extension Preferences), you can configure:

- `Share EPUB cover image` (default: enabled)
  - If disabled, no cover image is embedded in generated EPUB files.
- `Disable article links` (default: disabled)
  - If enabled, all links are removed from the article content before sending to Kindle.

## How Extraction Works

Main pipeline:

1. Fetch active tab HTML via the Raycast browser extension.
2. Apply CSS filters configured for the domain.
3. Extract primary readable content with `Readability`.
4. Convert to Markdown, then rebuild HTML for EPUB.
5. Inline images (with WebP conversion support when needed).
6. Resolve cover image:
   - first try `Cover CSS` selectors,
   - fallback to the first relevant article image.
7. Build EPUB (including cover if available).
8. Deliver via SMTP email or open in Send to Kindle app.

## Skills System (CSS Filter Profiles)

A "skill" is a per-domain profile:

- `domain`: e.g. `example.com`
- `selector`: elements to remove from article content
- `coverSelector`: targets used to find the cover image

Useful for:

- removing ads/popups/sidebars
- forcing a better cover image
- improving extraction on difficult websites

Bonus:

- JSON import/export for sharing filter profiles across machines.

## Advantages vs Official "Send to Kindle" Chrome Extension

| Feature                                                | This Raycast extension | Official Chrome extension |
| ------------------------------------------------------ | ---------------------- | ------------------------- |
| Outdated UX                        | ❌                    | ✅                        |
| Readability.js-based extraction for better results                        | ✅                     | ❌                        |
| Custom per-domain CSS filters                          | ✅                     | ❌                        |
| Manual cover photo selection (`Cover CSS`)             | ✅                     | ❌                        |
| Edit content before sending                            | ✅                     | ❌                        |
| Faster in email mode                                   | ✅                     | ❌                        |
| Uses site name instead of article author name          | ✅                     | ❌                        |
| Import/export filter profiles (JSON)                   | ✅                     | ❌                        |
| Two delivery methods (local app or email)              | ✅                     | ❌                        |
| Optional removal of all article links before sending   | ✅                     | ❌                        |
| Sending history   | ✅                     | ❌                        |

## Gmail App Password (Important)

If you use Gmail SMTP:

1. Enable POP in Gmail settings.
2. Use this SMTP configuration:
   - `SMTP Server`: `smtp.gmail.com`
   - `SMTP Port`: `587`
   - `SMTP Security`: `STARTTLS`
   - `SMTP Username`: your Gmail address
   - `SMTP Password`: your Google App Password
3. Enable 2-Step Verification on your Google account.
4. Generate an app password.
5. Use that app password in `SMTP Password`.
6. Do not use your main Google account password.

Gmail docs:

- SMTP setup: https://support.google.com/mail/answer/7104828?hl=en&visit_id=639059758371114804-114182322&rd=1
- App Password: https://support.google.com/mail/answer/185833?sjid=16238667612725057818-EU

Otherwise, SMTP authentication will fail.

## Amazon Setup Tips

- Confirm your Kindle email address in Amazon Send to Kindle settings.
- Add your sender email (`Sender Address`) to Amazon's approved sender list.
- Without this, Amazon may reject delivery.

## Quick Troubleshooting

- `Raycast browser extension is not available`
  - Install/enable the Raycast browser extension.
- Missing cover image
  - Add a `Cover CSS` selector targeting the article hero/cover image.
- SMTP error
  - Check host/port/security/username/password,
  - use a Gmail app password if needed,
  - verify sender address is approved in Amazon settings.
- Send to Kindle app not found
  - Install the Amazon app or switch to email mode.

## Useful Notes

- Email mode is generally the best choice for speed and reliability.
- Preview mode is ideal when you want to review/edit content first.
