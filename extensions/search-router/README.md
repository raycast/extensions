# Search Router

Implements DuckDuckGo !Bangs search directly in Raycast without sending traffic through a third party website 🔐

## What is Search Router?

Search Router lets you search specific websites from Raycast using shortcuts by implementing [DuckDuckGo !Bangs](https://duckduckgo.com/bangs). For example:

- `!g cats` searches Google for "cats"
- `!w cats` searches Wikipedia for "cats"
- `Help me fix my code !t3` uses t3.chat to ask AI to fix your code

> **Pro Tip:** ✨ For the best experience, set up Search Router as a [Fallback Command](https://manual.raycast.com/fallback-commands) in Raycast. This allows you to use bangs directly from the main Raycast search without having to first open the extension!

## Commands

### Search the Web 🌐

Type your query with an optional bang prefix/suffix:

- With search engine: `!yt funny videos` searches YouTube
- Without search engine: `funny videos` uses your default search engine

### Browse Search Engines 🧭

View and manage all available search engines and set your default search engine.

## Setting Up as a Fallback Command ⚡

For the most seamless experience:

1. In Raycast, search for "Manage Fallback Commands"
2. Add "Search the Web" from the Search Router extension to your enabled fallback commands
3. Now you can use bangs directly from Raycast's main search when no other results match!

## Contributing

Contributions welcome! Submit a pull request to add more search engines or improvements.

### Adding New Search Engines

To add new search engines to the extension:

1. Modify the `src/data/search-engines.ts` file with your new search engine definitions
2. Test your changes locally with `npm run dev`
3. Submit a pull request with your additions

## Credits 🙏

- [DuckDuckGo !Bangs](https://duckduckgo.com/bangs) - The original implementation of the bangs concept 🦆
- [Theo Browne's video on DuckDuckGo !Bangs](https://www.youtube.com/watch?v=_DnNzRaBWUU) - A great walkthrough of bangs and why he chose to implement it himself 📹
- [Search Router.link](https://search-router.link/) - Theo's web implementation of the same functionality 🔗
