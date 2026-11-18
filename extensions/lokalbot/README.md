# LokalBot for Raycast

Search and browse the private meeting library created by
[LokalBot](https://www.lokalbot.com/) without leaving Raycast.

## Requirements

- macOS 15 or later on Apple silicon
- [LokalBot 0.6.2 or later](https://github.com/stevyhacker/lokalbot/releases)
- **Allow external agents to read your meeting library** enabled in LokalBot's
  Settings → Privacy

The extension calls LokalBot's read-only `lokalbot-cli` helper. LokalBot does
not upload meeting content, but copied snippets and anything you manually share
from Raycast are governed by the destination application's privacy terms.

## Commands

### Quick Recall

Search meeting titles and summaries, inspect matching snippets, copy a snippet,
or reveal the meeting's local files in Finder.

### Recent Meetings

Browse the 20 most recent meetings with their capture source, transcript and
summary state, duration, and a Finder reveal action.

## CLI path

The extension first looks for `lokalbot-cli` on `PATH`, then falls back to the
helper bundled at:

```text
/Applications/LokalBot.app/Contents/Helpers/lokalbot-cli
```

Override the path in the extension preferences only when LokalBot is installed
somewhere else.
