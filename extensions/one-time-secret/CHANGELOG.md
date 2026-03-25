# One-Time Secret Changelog

## [Recent Secrets, region choice, and receipt access] - 2026-03-25

- Choose your **region** (Canada, EU, New Zealand, UK, or US) so you can decide where your data is stored.
- The extension now uses **Onetime Secret API v2**, the latest version of their service.
- Optionally add your **username** and **API token** to unlock **Recent Secrets**: see what you have shared, copy links, open them in the browser, jump to the full receipt page on the website, or **burn** a link so it stops working. Secrets you create from Raycast while signed in appear in this list.
- Optional **passphrases** must be at least **8 characters** when you use one.

## [Clipboard command and cleaner send flow] - 2026-03-24

- Adds **Send from Clipboard**: a no-view command that creates a one-time secret from the clipboard with a **3 hour** lifetime and **no passphrase**, then copies the share link (empty clipboard shows an error toast).
- **Send One-Time Secret**: after a successful share, Raycast **closes** and draft state is cleared so the form does not stay open with the previous secret, and reopening the command does not restore that secret.

## [AI Ready + Windows Support] - 2025-12-15
- Adds **Windows** support
- Adds support to use as an **AI** extension

## [More Secure and Useable] - 2023-06-28
- Sends secret and metadata in POST body which is encrypted over HTTPS instead of URL parameters
- Adds support for Drafts, allowing you to come back to a secret you're collating later

## [Initial Version] - 2023-06-21