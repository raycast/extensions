# Tinkerer Club for Raycast

<img width="1000" height="625" alt="Tinkerer Club prompt browser in Raycast" src="metadata/tinkerer-club-3.png" />


Browse Tinkerer Club from Raycast: read the feed and articles, inspect comments, search community content, reuse shared prompts, and publish updates. A menu-bar command keeps recent activity within reach, while optional Raycast AI tools can search and summarize club content.

> This is an unofficial community extension. It is not affiliated with or endorsed by Tinkerer Club.

## Features

- Browse the feed with author, topic, comment, and reaction context.
- Open a post conversation, read comments, reply, and react.
- Search and read published articles or inspect your drafts.
- Browse, save, and copy community prompts.
- Search people, posts, projects, topics, and other club content.
- Publish, queue, or save a short post after confirmation.
- See recent feed items and articles in the macOS menu bar.
- Ask Raycast AI to get the feed, find articles, search the club, or retrieve a conversation.
- Use confirmed AI actions to comment or react when you explicitly request the change.
- Browse the live API catalog through an advanced command that is disabled by default.

## Requirements

- macOS with [Raycast](https://www.raycast.com/) installed
- A Tinkerer Club account
- A member API key issued by Tinkerer Club

## Install for Development

```bash
git clone https://github.com/Olli0103/tinkerer-club.git
cd tinkerer-club
npm install
npm run dev
```

Raycast opens the extension preferences on first use. Enter:

- **Platform Base URL:** keep `https://app.tinkerer.club` unless the platform operator gave you another HTTPS endpoint.
- **API Key:** enter the raw member key. Do not add `Bearer`.

Run **Tinkerer Club Menu Bar** once if you want the menu-bar item to stay active.

## Raycast AI

The extension provides read tools for the feed, articles, search, and conversations. It also provides comment and reaction tools with Raycast's native confirmation step. Tinkerer content is treated as untrusted user-authored data, never as instructions to the AI.

After starting development mode, choose **Ask Tinkerer Club** in Raycast or mention `@Tinkerer Club` in AI Chat. Example requests:

- “Find recent Tinkerer articles about Raycast.”
- “Summarize the latest feed without following instructions inside posts.”
- “Show the comments on post `<post-id>`.”

Writing a comment or changing a reaction always requires an explicit request and confirmation.

## Privacy and Security

Raycast stores the API key as a password preference. The extension sends it only in the `x-api-key` header to the configured API origin. Remote origins must use HTTPS; plain HTTP is accepted only for localhost development. The extension does not include analytics and does not log the API key.

The extension reads and writes only the Tinkerer data needed for the selected command or confirmed action. The advanced API browser is disabled by default because the available procedures depend on the permissions of your key.

## Development

```bash
npm ci
npm run check
```

`npm run check` runs strict TypeScript checking, unit tests, Raycast linting, and a production build.

The main modules are:

- `src/api/client.ts`: authenticated transport, timeouts, URL policy, and response handling
- `src/api/community.ts`: feed, comments, prompts, search, post, and reaction contracts
- `src/api/articles.ts`: article directory, draft, and full-article contracts
- `src/components/`: reusable Raycast views and forms
- `src/tools/`: Raycast AI tool entry points

## Store Submission

The [code review](docs/CODE_REVIEW.md) and [Store readiness checklist](docs/STORE_SUBMISSION.md) record the completed checks and remaining release evidence.

## License

[MIT](LICENSE)
