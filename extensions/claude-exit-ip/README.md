# Claude Exit IP

A Raycast extension that shows the exit IP address, country, city, and ISP that claude.ai sees you connecting from.

The card asks Claude's own edge rather than a neutral IP endpoint, so it answers the route-specific question that matters under a VPN, proxy, or split tunnel.

The approach is derived from [ipcheck-ing](https://github.com/jason5ng32/raycast-extensions/tree/main/extensions/ipcheck-ing), which is credited as prior art. No code is copied from it.

## Development

```sh
npm install
npm run lint
npm run type-check
npm test
npm run build
```

To inspect failure cards manually, run `npm run dev`.
