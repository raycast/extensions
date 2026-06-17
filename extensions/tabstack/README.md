# Tabstack

Read, research, and act on the web from your keyboard. Powered by [Tabstack](https://tabstack.ai).

Tabstack brings the web into Raycast. Turn any page into clean Markdown, get an AI summary of a URL, ask a question and get a cited answer from across the web, or point a browser agent at a page and read back the result — all without leaving your launcher.

## Why use it

- **Stay in your flow.** Pull the web into Raycast instead of switching to a browser, copying, and cleaning up afterwards.
- **Clean content, fast.** Strip the clutter from any article, doc, or page and get readable Markdown you can paste anywhere.
- **Answers, not tabs.** Research a question once and get a synthesized, source-cited answer instead of ten open tabs.
- **Hands-off tasks.** Let a browser agent navigate a page and extract what you need, then read the result in place.

## Commands

| Command | What it does |
| --- | --- |
| **Extract to Markdown** | Turn any URL into clean, readable Markdown. |
| **Analyze a Page** | AI summary and analysis of any URL, guided by your instructions. |
| **Research a Question** | Get a cited answer pulled from across the web. Choose **Fast** for speed or **Balanced** to consult more sources. |
| **Automate a Task** | Run a read-only browser agent on a page and read the result. |

## Setup

1. Install the extension.
2. Create an API key at [console.tabstack.ai](https://console.tabstack.ai).
3. Paste the key into the extension's **Tabstack API Key** preference.

That's it — run any command and pass the URL or question as an argument.

## Privacy

Your API key is stored in Raycast preferences and passed directly to the Tabstack SDK. The extension never reads it from environment variables. The **Automate a Task** agent runs with `browse and extract only` guardrails — it reads pages, it does not act on your behalf.

## License

MIT
