# Send to Kindle (Raycast)

Send the current browser article to Kindle as a clean EPUB, with domain-based cleanup skills, cover control, edit-before-send, and delivery by email or the Send to Kindle desktop app.

## What This Extension Does

- Extracts readable article content from the active browser tab
- Applies per-domain "skills" (CSS filters + cover selectors)
- Lets you preview and edit title/content before sending
- Generates a Kindle-friendly EPUB with inlined images
- Delivers through:
  - `Email (Recommended)` via SMTP
  - `Send to Kindle app (Mac)` local app handoff

## Advantages vs Official "Send to Kindle" Chrome Extension

| Feature | This Raycast extension | Official Chrome extension |
| ------------------------------------------------------ | ---------------------- | ------------------------- |
| Outdated UX | ❌ | ✅ |
| Readability.js-based extraction for better results | ✅ | ❌ |
| Custom per-domain CSS filters | ✅ | ❌ |
| Manual cover photo selection (`Cover CSS`) | ✅ | ❌ |
| Guided cover selector picker (`Add Cover Skill`) | ✅ | ❌ |
| Guided filter selector (`Add Filter Skill`) | ✅ | ❌ |
| Cover preview before sending | ✅ | ❌ |
| Edit content before sending | ✅ | ❌ |
| Faster (in email mode) | ✅ | ❌ |
| Uses site name instead of article author name | ✅ | ❌ |
| Import/export filter profiles (JSON) | ✅ | ❌ |
| Two delivery methods (local app or email) | ✅ | ❌ |
| Optional removal of all article links before sending | ✅ | ❌ |
| Sending history | ✅ | ❌ |

## Cover Skill vs Filter Skill

The extension uses 2 complementary skill types per domain. 

When a skill is added, it is applied to all the future articles you will send from that domain.

- `Filter Skill`
  - Removes unwanted page blocks before extraction (ads, sidebars, popups, cookie walls, related-content blocks).
  - Goal: cleaner article body and better readability output.
  
- `Cover Skill`
  - Targets the best image to use as the Kindle cover.
  - Goal: consistent, high-quality cover image instead of random inline article images (or no image at all with the official "Send to Kindle Chrome extension").

In short:

- `Filter Skill` improves article content quality.
- `Cover Skill` improves book cover quality.

## Current Command Set

### `Send to Kindle`

Direct send with no preview UI.

- Loads active tab content
- Builds EPUB
- Sends immediately with your configured delivery method
- Adds entry to history

### `Preview and Send to Kindle`

Full preview workflow with metadata and actions.

Main actions:

- `Send to Kindle`
- `View Cover` (if cover can be resolved)
- `Add Cover Skill` (guided image candidate picker)
- `Add Filter Skill` (guided selector suggestion list with ranking)
- `Edit Content` (title + markdown body)
- `Copy Original Source Code`
- `Copy Markdown`
- `Reset Cover Skills for This Domain`
- `Reset Filter Skills for This Domain`
- `Reset All Skills for This Domain`
- `Reveal Output Folder`

### `Add a Skill`

Create/update a domain skill manually:

- `Domain`
- `CSS Filter` (elements to remove)
- `Cover CSS` (cover image selector(s))

Includes JSON import action from the form.

### `My Skills`

Manage existing skills:

- Search by domain/selector
- Edit
- Delete
- Export skill JSON
- Add a new skill

### `Send to Kindle History`

View previous sends with:

- Timestamp
- Open in browser
- Remove one entry
- Clear all history

### `Set / Change Sending Method`

Configure and validate delivery mode:

- `Send to Kindle app (Mac)`
- `Email (Recommended)` with SMTP test before save

## Delivery Modes

### Email (Recommended)

Sends the EPUB attachment directly to your Kindle email address.

Required fields:

- `Kindle Address` (for example `name@kindle.com`)
- `Sender Address` (Need to be in your Amazon Send to Kindle allowlist)
- `SMTP Server`
- `SMTP Port`
- `SMTP Security` (`SSL/TLS`, `STARTTLS`, `None`)
- `SMTP Username`
- `SMTP Password`

During setup, the extension tests SMTP connection/authentication and recipient acceptance before saving.

### Send to Kindle app (Mac)

Writes the EPUB and opens it with the Amazon Send to Kindle app. If Raycast cannot open the app directly, it tries to find a compatible app by name.

## Skill System

A skill is a per-domain profile:

- `domain`
- `selector` (content cleanup)
- `coverSelector` (cover lookup)

Behavior:

- Skills are unique per domain
- Adding a skill on an existing domain merges selectors (deduplicated)
- Domain matching supports subdomains (`news.example.com` can reuse `example.com`)
- You can reset only cover selectors, only content selectors, or all skills for a domain

### Guided Skill Creation in Preview

`Add Cover Skill`:

- Scans source images
- Shows visual candidates (width/height + selector)
- Saves selected selector as `Cover CSS`

`Add Filter Skill`:

- Extracts selector candidates from readable content
- Ranks them with confidence/specificity/risk scores
- Shows recommended subset first, with option to load all selectors

### Skill Import/Export

Skills can be transferred as JSON files.

- Export format: `send-to-kindle-skill` v1 payload
- Import accepts the same format (or direct filter object)

## Extension Preferences

In Raycast extension preferences:

- `Share EPUB cover image` (default: on)
  - If off, no cover is embedded in EPUB.
- `Disable article links` (default: off)
  - If on, links are stripped while keeping link text.

## How the Pipeline Works

1. Read active tab HTML through the Raycast browser extension.
2. Apply domain skill filters (`CSS Filter`).
3. Extract article content with `@mozilla/readability`.
4. Convert extracted content to markdown.
5. Build EPUB-compatible HTML from markdown.
6. Fetch and inline images into EPUB resources.
7. Resolve cover:
   - first from skill cover selectors,
   - fallback to first valid article image.
8. Build EPUB and send using configured delivery method.

## Requirements

1. Raycast installed
2. This extension installed
3. Raycast browser extension enabled (required to access active tab content)
4. Amazon Kindle account configured
5. For email mode:
   - Kindle email address
   - sender approved in Amazon Send-to-Kindle settings
   - valid SMTP credentials

## Platform Notes (macOS + Windows)

- Extension platform target is `macOS` and `Windows`.
- Email workflow is the most reliable cross-platform path.
- `Send to Kindle app` mode is intended for the macOS Amazon app.
- Some image conversion/resizing paths rely on macOS `sips`, so behavior can differ on Windows for WebP/AVIF-heavy pages.

## Gmail Setup (If You Use Gmail SMTP)

Use an app password, not your main Google password.

Suggested values:

- SMTP server: `smtp.gmail.com`
- Port: `587`
- Security: `STARTTLS`
- Username: your Gmail address
- Password: Google App Password

Useful docs:

- [Gmail SMTP setup](https://support.google.com/mail/answer/7104828?hl=en&visit_id=639059758371114804-114182322&rd=1)
- [Google App Passwords](https://support.google.com/mail/answer/185833?sjid=16238667612725057818-EU)

## Troubleshooting

- `Raycast browser extension is not available`
  - Install/enable the Raycast browser extension and retry.
- `Unable to load page` / extraction fails
  - Try `Preview and Send to Kindle`, then add filter skills for that domain.
- Cover missing
  - Add a `Cover CSS` selector with `Add Cover Skill`.
- SMTP setup failed
  - Recheck host/port/security/credentials and Amazon sender allowlist.
- Send to Kindle app not found
  - Install Amazon app or switch to `Email (Recommended)`.

## Data & Storage

- Skills, history, and sending settings are stored in Raycast LocalStorage.
- Generated EPUB files are created in the extension support path and cleaned after send attempts.
