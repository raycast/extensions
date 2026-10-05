# SayIntentions Raycast Extension

Fast access to [SayIntentions](https://www.sayintentions.ai/) via keyboard shortcuts. Great for flight sim sessions where you don't want to speak but still want quick ATC communication.

Supports sending to:
- COM1
- COM2
- Intercom 1
- Intercom 2

## Setup

1. Get your API key from the [Pilot Portal](https://p2.sayintentions.ai/#account) under "API Key (ACARS ID)"
2. Enter your API key when prompted

## Recommended Usage

Set command aliases for quick access. For example, set "Talk to ATC (COM1)" to `a`.

Then it's just: `Win+Space` → `a` → `Space` → type your message → `Enter`

This is best for one-off messages, e.g. "Ready for pushback" as your Co-Pilot can do the readbacks. This extension also supports both intercoms, so messages like "Please announce to the cabin that we are going to land soon" would be a great fit for this extension.

## Preset Messages with Deeplinks

You can create [deeplinks](https://developers.raycast.com/information/lifecycle/deeplinks) to send preset messages instantly. This is useful for common phrases you use frequently.

**Format:**
```
raycast://extensions/kyleawayan/sayintentions/<command>?arguments=<url-encoded-json>
```

**Example:** "Ready to taxi" on COM1:
```
raycast://extensions/kyleawayan/sayintentions/talk-to-atc-com1?arguments=%7B%22message%22%3A%22Ready%20to%20taxi%22%7D
```

These deeplinks can also be added as [Quicklinks](https://manual.raycast.com/windows/quicklinks)!

## References

- [SayAs API Docs](https://sayintentionsai.freshdesk.com/support/solutions/articles/154000233373-sayas-api-make-the-co-pilot-cabin-crew-atc-say-whatever-you-want-or-automate-your-own-comms-to)
- Logo from [SayIntentions website](https://www.sayintentions.ai/).
