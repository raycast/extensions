# LokalBot for Raycast

Search, browse, and ask about the private meeting library created by
[LokalBot](https://www.lokalbot.com/), and draft replies from it, without
leaving Raycast.

## Requirements

- macOS 15 or later on Apple silicon
- [LokalBot 0.6.2 or later](https://github.com/stevyhacker/lokalbot/releases)
  (a release newer than 0.10.10 for Ask LokalBot and Draft Reply, which also
  need the LokalBot app running)
- **Allow external agents to read your LokalBot data** turned on in LokalBot's
  Settings → External Agents (Settings → Privacy → External agents in
  earlier versions), with **Meetings** ticked (older
  releases call it **Allow external agents to read your meeting library**)

The extension calls LokalBot's read-only `lokalbot-cli` helper. Ask LokalBot
and Draft Reply send your question, or the text you selected, to LokalBot's
local model on this Mac; the extension does not use Raycast AI or any other
server. LokalBot does not upload meeting content, but copied snippets, pasted
drafts, and anything you manually share from Raycast are governed by the
destination application's privacy terms.

## Commands

### Quick Recall

Search meeting titles, summaries, and transcripts, inspect matching snippets, copy a snippet,
or reveal the meeting's local files in Finder.

### Ask LokalBot

Ask a question about your meetings. LokalBot's local model answers from the
meetings that match and lists them, so you can check the answer or reveal a
meeting's files in Finder. The first question after LokalBot starts can take
up to a minute while the model loads.

### Draft Reply

Select a message in any app (or copy it) and run Draft Reply. LokalBot drafts
your reply from what your meetings say about it, without inventing facts they
do not support, and **Paste Draft** puts it into the app you came from. Add an
instruction such as "keep it short" as the optional argument. A message no
meeting matches gets no draft.

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

## Resources

- [LokalBot website](https://www.lokalbot.com/)
- [Local Desktop AI Leaderboard](https://www.lokalbot.com/benchmarks)
- [Local AI Hardware & RAM Calculator](https://www.lokalbot.com/hardware)
- [Guides & comparisons](https://www.lokalbot.com/guides)
