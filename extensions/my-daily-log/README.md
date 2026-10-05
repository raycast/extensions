# My Daily Log

Log what you do every day. It's a good habit!

## Setup

The first time you use the extension, you will be prompted to set up a directory to store your logs. You can also change this later in the Raycast preferences. Your logs are plain JSON files (one per day), so you can put the folder in iCloud Drive or Dropbox to sync it between machines.

## Commands

- **New Log**: log what you just did. Type the title as an argument to log it instantly, or open the form to pick another date/time and log something you forgot.
- **My Daily Log**: the logs of a day, with actions to edit, delete, copy the day as Markdown, and move between days (`⌘ [` / `⌘ ]`). The optional argument accepts `t` (today), `y` (yesterday), a number of days ago (`3`), a weekday (`fri`) or a date (`2022-12-31`).
- **Logged Days of Month**: every day you logged something, grouped by month.
- **Search Logs**: search everything you have ever logged.
- **Log Reminder**: a menu bar item that reminds you to log when you haven't logged anything for a while. You can configure the interval, your working hours, weekends and notifications, and snooze it from the menu.
- **Day Summary**, **Summary of a Week**, **Summary of a Month** and **Day Standup Speech**: AI generated summaries, weekly reports and standup speeches.

## AI features with your own (local) model

The AI commands don't use Raycast AI. They work with any server that exposes an OpenAI-compatible API, so your logs can stay on your machine.

### Ollama (default)

1. Install [Ollama](https://ollama.com) and start it.
2. Download a model, e.g. `ollama pull llama3.2`.
3. That's it: the default preferences point to `http://localhost:11434/v1` and the `llama3.2` model. Change the **AI Model** preference to use any other model you have (`ollama list`).

### Other providers

Set the **AI Server URL**, **AI Model** and, if needed, **AI API Key** preferences:

| Provider | AI Server URL |
| --- | --- |
| Ollama | `http://localhost:11434/v1` |
| LM Studio | `http://localhost:1234/v1` |
| llama.cpp server | `http://localhost:8080/v1` |
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |

### Thinking and extra model parameters

Reasoning models (e.g. `qwen3`, `deepseek-r1`, `gpt-oss`) can be slow because they "think" before answering. Set **AI Thinking** to **Disabled** to turn it off (the equivalent of `ollama run qwen3 --think=false`).

Use **Extra Model Parameters** to send any other parameter supported by your server with every request, either as flags or as JSON:

```
--think=false --temperature=0.2 --top_p=0.9
```

```json
{ "temperature": 0.2, "seed": 42, "max_tokens": 800 }
```

`think` is translated to the `reasoning_effort` parameter that OpenAI-compatible APIs (including Ollama's) expect.

Use the **Extra AI Instructions** preference to customise every answer, e.g. `Answer in Spanish` or `Use at most 5 bullet points`.

## Upgrading from older versions

Older versions named the log files after the UTC date, so logs written in the evening or right after midnight could show up on the wrong day. The first time you open this version, your logs are moved to the files of their local date. A backup of the previous files is kept in a hidden `.backup-…` folder inside your logs folder.
