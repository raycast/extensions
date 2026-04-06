# Bookface Companion

A Raycast extension for Y Combinator founders. Search Bookface, browse the feed, chat with the YC Agent, and track your demo day countdown, all from your menu bar and keyboard.

## Commands

### Demo Day Countdown

A menu bar countdown showing days, hours, and minutes until your next demo day. Updates every minute. The date is fetched dynamically from Bookface based on your batch.

### Search Bookface

Search across all of Bookface: founders, companies, investors, deals, knowledge base, and the startup library. Results are grouped by type with direct links to Bookface.

### Bookface Feed

Browse the latest Bookface posts with full post content, threaded comments, and upvote counts. Upvote posts directly from Raycast.

### Ask YC Agent

Chat with the YC Agent from Raycast. View previous conversations, start new ones, and get responses inline. The search bar acts as your input: type a question and press Enter.

## Setup

1. Install the extension from the Raycast Store
2. Open any command and you'll be prompted to set your YC credentials in extension preferences
3. Enter your **YC username** and **password** (stored encrypted in your system keychain)

Your credentials are used to authenticate with Bookface. A session token is cached locally for up to 1 year.

## Privacy

- Credentials are stored encrypted via Raycast's secure preferences API
- Authentication tokens are cached in Raycast's local encrypted storage
- No data is sent to any third party. All requests go directly to `ycombinator.com`
