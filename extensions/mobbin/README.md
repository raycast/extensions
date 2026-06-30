# Mobbin for Raycast

Search [Mobbin](https://mobbin.com) UI screens with natural language and copy design references — without leaving Raycast.

> **Unofficial extension.** Community-built and not affiliated with, endorsed by, or operated by Mobbin. "Mobbin" and the Mobbin logo are trademarks of their respective owner. You use it with your own Mobbin account / API key.

![Searching "Login Screen" in the Mobbin Raycast extension, showing iOS results from Snapchat, Discord, Twitch, and DoorDash](./media/search.png)

## Features

- **Natural-language search** over Mobbin screens for iOS and Web.
- **Search the selected text** in the frontmost app via a dedicated command.
- **Grab references fast** — open in Mobbin, copy the screen URL, copy a Markdown/HTML `<img>` snippet, copy JSON metadata, or download / copy / paste the image file. Quick Look the downloaded image.
- **Favorites & history**, plus *exclude from current search* to refine results.
- **Two authentication modes** — a REST API key (Mobbin Team/Enterprise) or OAuth via the Mobbin MCP server.

## Commands

| Command | Description |
| --- | --- |
| **Search Mobbin** | Search Mobbin screens using a natural-language prompt. |
| **Search Selected Text** | Search Mobbin using the selected text from the frontmost app. |

## Authentication

Pick a mode in the extension preferences:

- **REST API Key** — paste a Mobbin Team or Enterprise API key (`mobbin_…`).
- **OAuth MCP** — connect your Mobbin account through the Mobbin MCP server (`https://api.mobbin.com/mcp`). Choose OAuth MCP in preferences, then run **Search Mobbin → Connect OAuth MCP** from the action panel when prompted; a browser opens for authorization and tokens are stored securely by Raycast. No API key required.

## Preferences

- **Authentication Mode** — REST API Key or OAuth MCP.
- **Mobbin API Key** — used only in REST mode.
- **Default Platform** — iOS or Web.
- **Default Search Mode** — Deep (better for nuanced prompts) or Standard.
- **Default Image Quality** — Optimized or High.
- **Default Result Limit** — number of screens requested per search.

## Development

```bash
npm install
npm run dev      # ray develop — live-reloads into Raycast
npm test         # vitest
npm run build    # ray build
npm run lint     # ray lint
```

## License

[MIT](./LICENSE) © Niklas Schmidt
