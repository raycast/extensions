# Grok Bots

Send a prompt to any of your Grok Bots from Raycast.

```
Chat with Grok Bot   [summarize this week's AI news]
```

Run **Chat with Grok Bot** with an optional prompt. It opens a list of your Bots. Type to filter (`ad` → *Ada · Research Bot*), then press ↩ to send the prompt to the Bot you select. If you didn't give a prompt, ↩ opens a form for writing one. Each Bot shows a preview of its latest message to you, plus unread counts and pins. Press ⌘Y (**Show Recent Messages**) to open a side panel with the selected Bot's recent chat, newest first, so you can see where things left off; it stays open until you close it.

Choose how Bots are ordered with **Sort Bots By** in the extension's preferences: **Most Used** (default), **Latest Activity**, **Grok Bot Sidebar Order** (grouped into your Grok Bot sidebar sections), or **Name**.

## Requirements

- macOS with the [Grok Bot](https://docs.x.ai/grok-bot) desktop app installed and signed in.
- For auto-send: two macOS permissions for Raycast (see [Allow auto-send](#allow-auto-send)).

## Allow auto-send

Grok Bot's prompt links only fill in the message box. Auto-send, which is on by default, then presses Return in Grok Bot for you, and macOS has to allow Raycast to do that. In **System Settings → Privacy & Security**, turn on:

1. **Accessibility → Raycast**, so Raycast can press keys.
2. **Automation → Raycast → System Events**, so Raycast can tell when Grok Bot is in front and holds your prompt.

macOS usually asks for the Automation permission the first time you send a prompt; choose **Allow**. If you see "Prompt is in Grok Bot. To auto-send, allow Raycast → System Events…", or the prompt just sits in Grok Bot unsent:

- Check **Automation** first. If Raycast isn't listed there, macOS remembered an earlier "Don't Allow" and won't ask again. Reset it, then send a prompt and choose **Allow**:

  ```sh
  tccutil reset AppleEvents com.raycast.macos
  ```

  This resets every Automation permission Raycast has, so other Raycast features that control apps will ask again once.
- Each auto-send attempt is logged to `~/Library/Application Support/com.raycast.macos/extensions/grok-bots/auto-send.log`. Errors there name the step that failed; `-1743` means the Automation permission is missing.

Auto-send never sends an older draft: if the Bot's message box already holds unsent text, Grok Bot keeps it instead of your prompt, and the extension presses nothing.

Don't want auto-send? Turn off **Send automatically** in the extension's preferences. Prompts then wait in Grok Bot's message box for you to press Return.

## How prompts are sent

| Method | What happens | Setup |
| --- | --- | --- |
| **Prompt link + auto-send** (default) | Opens Grok Bot's [prompt link](https://docs.x.ai/grok-bot/deep-links), which puts your prompt in the Bot's message box, then presses Return (or ⌘Return, if Grok Bot sends that way). | The two permissions above. |
| **Prompt link only** | Same, but you press Return in Grok Bot yourself. | Turn off **Send automatically**. |
| **Routine webhook** | POSTs `{"prompt": "…", "source": "raycast"}` to one of the Bot's [routine webhooks](https://docs.x.ai/grok-bot/skills-routines-and-automations). The Bot runs in the background and replies in its chat. Grok Bot doesn't open. | **Set Up Webhook…** (⌘⇧W) on a Bot. |

- Prompt links can carry up to 1,000 characters. For a longer prompt, the extension copies it to your clipboard and opens the chat for you to paste it.
- The first time a prompt link opens, Grok Bot may ask you to confirm it. Turn that confirmation off so auto-send works.
- To set up a webhook, ask the Bot something like *"Add a routine with a webhook trigger that does whatever I send in the prompt field."* Then open the routine in Grok Bot on desktop and copy **POST to** and **key** into the form. The extension also accepts the full `Authorization: Bearer …` header. The key is kept in Raycast's encrypted local storage.

## Other actions

- **Open Chat in Grok Bot** (⌘O)
- **Create Quicklink for <Bot>** (⌘⇧L): adds a Raycast Quicklink, like `Ask Ada {Prompt}`, for a Bot you message often.
- **Copy Bot ID**, **Copy Prompt Link**

## How your Bots are found

Grok Bot doesn't offer a public API for listing Bots, so the extension reads the Bot list that the Grok Bot desktop app keeps on your Mac in `~/Library/Application Support/Grok Bot`. It only reads, and never changes, the Bot list (names, avatars, pins, sections and unread counts) and the recent messages Grok Bot has saved for each chat, which it uses for the previews and the recent-messages panel. Messages between Bots aren't shown. The list is reloaded every time you run the command; if you add or rename a Bot while the list is open, use **Reload Bots** (⌘R).

This relies on how the current Grok Bot app stores that list, not on a documented format, so a Grok Bot update can break it. If that happens, the command shows "Couldn't load your Grok Bots" instead of a wrong list. If Grok Bot keeps its data somewhere else, set **Grok Bot Data Folder** in the extension's preferences.

## Privacy

Everything stays on your Mac. The extension makes no network requests except to a routine webhook you set up yourself.

This is an unofficial extension and isn't affiliated with or endorsed by xAI.
