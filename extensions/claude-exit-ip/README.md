# Claude Exit IP

A Raycast extension that shows the exit IP address, country, city, and ISP that claude.ai sees you connecting from.

The card asks Claude's own edge rather than a neutral IP endpoint, so it answers the route-specific question that matters under a VPN, proxy, or split tunnel.

Install it from the [Raycast Store](https://www.raycast.com/marcuslannister/claude-exit-ip).

The approach is derived from [ipcheck-ing](https://github.com/jason5ng32/raycast-extensions/tree/main/extensions/ipcheck-ing), which is credited as prior art. No code is copied from it.

## Development

```sh
npm install
npm run lint
npm run type-check
npm test
npm run build
```

To inspect each card state manually, run `npm run dev` and make one temporary edit at a time. Revert the edit after you look.

| Card state              | Temporary edit                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `geo-failed`            | In `src/lib/fetchGeo.ts`, set `GEO_URL` to a host name that does not resolve.                |
| `blocked` (non-2xx)     | In `src/lib/fetchTrace.ts`, set `TRACE_URL` to a URL that returns 404.                       |
| `blocked` (not a trace) | In `src/lib/fetchTrace.ts`, set `TRACE_URL` to `https://example.com`.                        |
| `unreachable`           | Turn Wi-Fi off. No edit is necessary.                                                        |
| `loading` and `ip-only` | Add `await new Promise((r) => setTimeout(r, 2000));` before the geo call in `src/index.tsx`. |
