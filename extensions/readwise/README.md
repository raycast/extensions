# Readwise

Raycast extension to search and browser your [Readwise library](https://readwise.io/).

## Features

- Search recent Highlights
- Search recent entries of your Readwise Library (books, articles, ...)
- Ask Readwise in Raycast AI to browse your library and summarize saved highlights and notes.

## Ask Readwise

Open **Ask Readwise** in Raycast, or mention `@readwise` in AI Chat. Requires Raycast Pro
and your Readwise API token. For example, ask "Summarize my highlights from Deep Work"
or "Show the articles in my library".

AI instructions and evals are stored in `ai.yaml`. Run `npx ray evals` to validate
tool selection and responses against mocked Readwise data.

## Configuration

### Readwise API Token

In order to use this extension, you have to get an API Token for your Readwise
account.

1. Open <https://readwise.io/access_token>
2. Click the "Get Access Token" button
3. Copy your new token and paste it in Raycast's required preference item of the extension

### Page Size

Readwise allows to specify the number of results per page. The default is 100,
and can be anything between 1 and 1000.

Open the Readwise extensions settings and change the value of "Page Size"
according to your needs.

## Tests

Use Node.js 22.22.2 or later on the 22.x release line, or Node.js 24.x or 26 and later.
Install dependencies with `npm ci`.

- `npm test` runs the Vitest suite once.
- `npm run test:watch` reruns tests when files change.
- `npm run test:coverage` prints coverage and writes an HTML report to `coverage/index.html`.
- `npm run typecheck` checks the extension, tests, and Vitest configuration.

The suite covers helpers, Readwise API requests, SWR hook contracts, AI tools, and browser-opening commands.
Tests mock HTTP requests and the Raycast API. Date tests run in UTC for consistent results.
Coverage reports include only the modules covered by this suite.
