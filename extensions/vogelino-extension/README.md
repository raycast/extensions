# Vogelino Cool Sites

Browse, search, and add cool sites featured on the Vogelino portfolio.

## Setup

The extension uses the existing GitHub CLI login to trigger repository dispatch events for
`vogelino/vogelino-portfolio`. Run `gh auth login` once in Terminal. A personal access token can optionally be stored in
Raycast Preferences as a fallback.

Install Raycast's browser extension to let the extension read the active tab in supported browsers. Arc is also supported
through a local fallback.

## Commands

- **Search Cool Sites** browses and filters the portfolio's cool-site collection.
- **Quick Add Cool Site** cleans and checks the current tab, suggests existing tags, and queues it without showing a form.
- **Add Cool Site with Review** pre-fills the same metadata in a form so it can be adjusted before publishing.

Tag suggestions use Raycast AI when available and fall back to matching the site's content against existing tags.
