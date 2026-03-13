# Slack Summarizer

Summarize any Slack channel or thread directly from **Raycast** using OpenAI.
Perfect for catching-up after vacations, keeping stakeholders in the loop, or turning noisy discussions into succinct, bullet-point briefs.

---

## ✨ Features

| Command                     | What it does                                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Summarize Slack Channel** | Picks every standalone message and thread in a channel over the last *n* days and generates a concise digest.    |
| **Summarize Slack Thread**  | Takes a single thread URL (or timestamp) and produces an executive summary, highlighting decisions & next steps. |

Both commands respect a **custom OpenAI prompt** so you can fine-tune tone, detail level, language, etc.

## ⚙️ Requirements

- A **Slack workspace** where the Raycast Slack App can be installed with the scopes below.

- An **OpenAI API key**.

### Slack OAuth scopes

`channels:read`,
`channels:history`,
`groups:read`,
`groups:history`,
`im:read`,
`im:history`,
`mpim:read`,
`mpim:history`,
`users:read`,
`search:read`

> The extension uses a PKCE OAuth flow; **no server is required**.
> Tokens are stored in Raycast’s local secure storage.

## Setup

### Raycast Preferences
   Open Raycast → *Extensions* → *Slack Summarizer* and set:

   | Preference                   | Description                                            |
   | ---------------------------- | ------------------------------------------------------ |
   | **OpenAI API Key**           | `sk-...` key from your OpenAI dashboard                |
   | **Default OpenAI Model**     | E.g. `gpt-4.1`,`gpt-4.1-nano`, `o3` etc.             |


### Authorize Slack
   Launch either command; the first run triggers an OAuth browser window.
   Select the workspace → grant the requested scopes → done.

## 📝 Custom Prompt Tips

The *Custom Prompt* preference is pre-pended to every request.
Examples:

* `Provide a short TL;DR at the top, then bullet points.`
* `Focus only on action items and decisions; omit pleasantries.`

## 🚧 Limitations

* Large channels (> 1,000 messages) may hit Slack rate limits – exponential back-off is built-in, but huge digests can take time.
* Slack attachments (files, images) are ignored; only text is summarized.

## 📜 License

MIT © 2025 – Contributors.
