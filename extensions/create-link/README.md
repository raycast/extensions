# Create Link

## What is this extension

The Create Link extension for Raycast copies browser-tab links in various formats and converts a clipboard URL into a rich title hyperlink for Slack.

### Key Features

- Copy the current browser URL as plain text.
- Generate and copy HTML links for web integration.
- Create and copy Markdown links for documentation and note-taking.
- Seamlessly integrates with your browser for quick access.
- Copy a URL from anywhere and paste its page title as a clickable hyperlink in Slack.

### Requirements

The browser-tab commands require the [Raycast Browser Extension](https://www.raycast.com/browser-extension). **Copy Clipboard URL for Slack** does not require the browser extension or an open browser tab.

### Copy a clipboard URL for Slack

1. Copy an HTTP or HTTPS URL.
2. Run **Copy Clipboard URL for Slack** in Raycast.
3. Paste normally into Slack.

The command fetches the page title and copies an HTML anchor plus the original URL as the plain-text representation. Slack can paste the title as a clickable link; plain-text destinations receive the URL. This is not literal `<URL|Title>` mrkdwn or `[title](url)` Markdown.

The existing **Copy Link as HTML** command still copies HTML source text from a browser tab. Its behavior, along with Markdown, custom formats, and Show Tabs, is unchanged.

#### GitHub titles and fallback behavior

For GitHub pull requests, issues, and repository discussions, the command optionally uses an installed, authenticated [GitHub CLI](https://cli.github.com/) (`gh auth login`). On macOS it checks `/opt/homebrew/bin/gh`, `/usr/local/bin/gh`, and `/usr/bin/gh`. Authentication stays with `gh`; the extension does not request or store a token.

GitHub CLI lookups have a five-second timeout. If `gh` is unavailable or fails, the command fetches page HTML and stops as soon as it finds a complete, nonempty `<title>`. At `</head>` or end of response, it uses `og:title` if no title was found, or the URL if neither is available. Unread content is cancelled, so a large or slow body after the title does not prevent success. While searching, it inspects at most 1 MiB (1,048,576 bytes), independent of `Content-Length`, and retains the six-second timeout. Unresolved lookups exceeding either limit copy the original URL and show an error. It does not use browser cookies or execute page JavaScript, so other sign-in-only or dynamically rendered pages may not provide a usable title.

If the page has no title, the URL is used as the link text. If fetching fails, the command copies the original URL and shows an error. Invalid clipboard input is left untouched. URLs are fetched only when you run the command; GitHub lookups use your existing account permissions.

#### Platform validation

The new clipboard command has been developed and automatically tested on macOS. Pasting a clickable title into Slack and the original URL into plain-text destinations has been manually verified for the integrated command on macOS.

Windows support has not been verified. GitHub CLI discovery currently checks only the Unix paths listed above, not Windows `gh.exe` installations. The HTTP fallback does not require `gh`, but Windows clipboard behavior and subprocess handling need validation before claiming support. This contribution does not change the platform declaration or browser commands of the existing extension.

### Development

From `extensions/create-link`, install dependencies with `npm ci` and run `npm run dev` to load the extension into Raycast.

`src/utils/github-title.ts` owns GitHub CLI discovery and authenticated title lookups. `src/utils/page-title.ts` handles URL validation, HTML title extraction, and the GitHub-to-HTTP fallback.

Run `npm test`, `npm run lint`, and `npm run build` before submitting changes. For the manual paste check, copy a public page URL, run **Copy Clipboard URL for Slack**, and paste into Slack: the title should be clickable. Paste the same clipboard into a plain-text editor: it should contain only the original URL.
