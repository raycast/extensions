# Claude Exit IP

A Raycast extension that shows the exit IP address, country, city, and ISP that claude.ai sees you connecting from.

The card asks Claude's own edge rather than a neutral IP endpoint, so it answers the route-specific question that matters under a VPN, proxy, or split tunnel.

Published on the Raycast Store as [claude-exit-ip](https://www.raycast.com/marcuslannister/claude-exit-ip). The Store copy is submitted from this repo with `npm run publish`, which opens a pull request against [raycast/extensions](https://github.com/raycast/extensions); this repo stays the source of truth.

The approach is derived from [ipcheck-ing](https://github.com/jason5ng32/raycast-extensions/tree/main/extensions/ipcheck-ing), which is credited as prior art. No code is copied from it.

The extension icon is rendered from the official SVG served by [claude.ai](https://claude.ai/favicon.svg).

## Development

```sh
npm install
npm run lint
npm run type-check
npm test
npm run build
```

To inspect failure cards manually, run `npm run dev` and use the forcing recipes in the project spec under `.scratch/claude-exit-ip/spec.md`.
