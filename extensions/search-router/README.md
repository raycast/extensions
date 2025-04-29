# Search Router

Implements Kagi Search bangs directly in Raycast without sending traffic through a third party website 🔐

## What is Search Router?

Search Router lets you search specific websites from Raycast using shortcuts by implementing [Kagi Search bangs](https://help.kagi.com/kagi/features/bangs.html). For example:

- `!g cats` searches Google for "cats"
- `!w cats` searches Wikipedia for "cats"
- `Help me fix my code !t3` uses t3.chat to ask AI to fix your code
- `markdown parser @gh` searches for "markdown parser" specifically within Github's domain (site:github.com)
- And many more! See all available bangs in [Kagi Bang Explorer](https://kbe.smaertness.net)

> **Pro Tip:** ✨ For the best experience, set up Search Router as a [Fallback Command](https://manual.raycast.com/fallback-commands) in Raycast. This allows you to use bangs directly from the main Raycast search without having to first open the extension!

## Commands

### Search the Web 🌐

Type your query with an optional bang prefix/suffix:

- With search engine: `!yt funny videos` searches YouTube
- Without search engine: `funny videos` uses your default search engine
- Site-specific search: `funny videos @yt` searches for "funny videos" only within YouTube's domain

### Browse Search Engines 🧭

View and manage all available search engines and set your default search engine.

## Setting Up as a Fallback Command ⚡

For the most seamless experience:

1. In Raycast, search for "Manage Fallback Commands"
2. Add "Search the Web" from the Search Router extension to your enabled fallback commands
3. Now you can use bangs directly from Raycast's main search when no other results match!

## Contributing

Contributions welcome! Submit a pull request to add more search engines or improvements.

### Managing Search Engines

This extension uses search engine definitions from [Kagi's bangs repository](https://github.com/kagisearch/bangs). Here's how to add or update search engines:

1. To add a new search engine:
   - Fork [Kagi's bangs repository](https://github.com/kagisearch/bangs)
   - Add your search engine definition following their schema
   - Submit a PR to Kagi's repository

2. To update this extension with latest engines:
   - Fork this repository
   - Run `npm run download-kagi-bangs` to fetch latest definitions
   - Test locally with `npm run dev`
   - Submit a PR

Want to add custom search engines directly in the extension? We plan to add UI configuration in the future. In the meantime, PRs implementing this feature are welcome! 🙂

## Credits 🙏

- [Kagi Search Bangs](https://help.kagi.com/kagi/features/bangs.html) - The implementation of the bangs concept 🔍
- [Kagi Bangs Repository](https://github.com/kagisearch/bangs) - The official repository of Kagi Search bangs 📚
- [DuckDuckGo !Bangs](https://duckduckgo.com/bangs) - The original implementation of the bangs concept 🦆
- [Theo Browne's video on DuckDuckGo !Bangs](https://www.youtube.com/watch?v=_DnNzRaBWUU) - A great walkthrough of bangs and why he chose to implement it himself 📹
- [unduck.link](https://unduck.link/) - Theo's web implementation of the original functionality with DuckDuckGo's bang 🔗
