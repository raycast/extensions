# Morgen for Raycast

Your Morgen calendar, a few keystrokes away. See today's schedule, find upcoming meetings, and create events through commands or Raycast AI.

An independent, open-source integration maintained by [chaOSSlabs](https://github.com/chaosslabs). Not affiliated with or endorsed by Morgen.

[Source code](https://github.com/chaosslabs/morgen-raycast) · [Report an issue](https://github.com/chaosslabs/morgen-raycast/issues) · [MIT license](LICENSE)

## Commands

### List Today's Events

View all calendar events scheduled for today. Events are sorted by start time and show duration and calendar name. Supports multiple calendar accounts.

### Search Events

Search through your upcoming events for the next 30 days. Filter results in real time by typing in the search bar.

### Create Event

Create a new calendar event with a title, date, start time, duration, and calendar selection. Read-only calendars are automatically filtered out. Your timezone is detected automatically.

## Setup

1. Install dependencies with `npm ci`, then run `npm run dev` to import this local extension into Raycast. Use Node.js 22.14 or newer.
2. Get your Morgen API key from the Developers API page at [Morgen platform](https://platform.morgen.so). Your Morgen plan must include API access.
3. Enter the key in the extension preferences in Raycast; do not put it in source files or chat.
4. Open Raycast AI Chat and mention `@Morgen`, or search for **Ask Morgen**. Raycast AI access is required.

## Calendar scope

Set **Calendar Scope** in Raycast extension preferences to an exact calendar name to restrict commands and AI tools to matching calendars. Leave it empty to use all connected calendars. If the name does not match, the extension returns an error instead of querying other calendars. Calendar names may not be unique across accounts; use a unique name when strict isolation is needed.

Set **Scoped Calendar Display Name** to an optional label such as “Personal” for the scoped calendars in commands and AI results. This does not rename calendars in Morgen or change their IDs. It only applies when Calendar Scope is set. Event content can still contain private details.

## AI tools

- **List Calendars** returns calendar IDs, write permissions, current time, and your local timezone.
- **Find Events** reads events across connected calendars for a range of up to 62 days, optionally filtering by title.
- **Create Event** creates one timed event after a confirmation preview showing title, calendar, start/timezone, and duration. Raycast tool permission settings govern when confirmation is shown.

Try “What meetings do I have tomorrow?” or “Create a 45-minute Focus event tomorrow at 10 on my Work calendar.” If calendars are ambiguous, the AI should ask which one to use. Event creation does not invite attendees; editing, deleting, recurring events, and all-day creation are not supported by these tools.

Creation errors must not be automatically retried: check Morgen first in case the request succeeded before the connection failed.

See [Raycast AI Extensions](https://developers.raycast.com/ai/create-an-ai-extension) and [Morgen authentication](https://docs.morgen.so/authentication).

## Development

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Lint
npm run lint

# Type-check
npx tsc --noEmit
```

Run `npm test` for isolated tool/API tests and `npm run build` to validate generated AI tool schemas. These checks do not verify a live Morgen account. The public Store publisher is `biancarosa`. Source code and project maintenance remain under chaOSSlabs on GitHub. Store publication remains subject to Raycast review.

For a paced end-to-end check against a real personal/test calendar, follow the [synthetic test guide](docs/synthetic-test.md). Recorded outcomes are in [live testing](docs/live-testing.md).

## Data and privacy

The extension reads your API key from Raycast preferences and sends authenticated requests to Morgen. It does not include a separate analytics service. When using AI tools, calendar names and event details returned by those tools are available to Raycast AI; review your Raycast AI settings before use.

## Contributing

Bug reports and pull requests are welcome in the chaOSSlabs repository. Include reproduction steps and redact API keys and private calendar details. Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` before submitting a change.
