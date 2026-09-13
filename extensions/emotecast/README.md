# Emotecast

Search Twitch emotes from Raycast and paste them straight into whatever you were
typing in — animation included.

- `⏎` pastes at **32px**, roughly emoji size
- `⇧⏎` pastes at **128px**, roughly sticker size

Emotes are pasted as image **files**, not as links, so the animation survives and
the recipient sees the emote rather than a URL. That is what lets you send
animated emotes on Discord without Nitro.

## Sources

Pick one from the dropdown. 7TV is the default.

| Source | Catalogue | Notes |
| --- | --- | --- |
| [7TV](https://7tv.app) | ~1.4M emotes | Served at exactly 32 and 128px, so nothing is ever re-encoded |
| [BetterTTV](https://betterttv.com) | Large | Served at 28/56/112px, resized to the exact target |
| [FrankerFaceZ](https://frankerfacez.com) | Large | Animated emotes are WebP, converted to GIF |

Static and animated emotes are both included. Press `⌘⇧A` to show animated ones
only. NSFW emotes are hidden behind a placeholder and revealed when selected.

## Requirements

**7TV needs nothing** — its emotes are already at the right size and in GIF form.

The other two sources are only served at 28/56/112px, so reaching an exact 32 or
128px requires re-encoding:

```sh
brew install ffmpeg      # BetterTTV, and static FrankerFaceZ emotes
brew install imagemagick # animated FrankerFaceZ emotes, which are WebP
```

Raycast does not inherit your shell `PATH`, so both are looked up at their usual
Homebrew locations. If yours live elsewhere, set the full path in the extension
preferences.

## A note on Discord

Discord cannot render an arbitrary image *inline* inside a line of text. In its
message model `content`, `attachments` and `embeds` are separate fields, and only
custom emojis — a Nitro feature — are part of the text itself.

What this extension gives you is the closest thing available without Nitro: a
correctly sized, animated emote that everyone can see, in DMs and servers alike,
with no bot and no client mod.

## Credits

Emotes belong to their respective creators. This extension only searches the
public APIs of 7TV, BetterTTV and FrankerFaceZ and does not redistribute any
emote.
