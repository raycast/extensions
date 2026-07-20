# Twos for Raycast

A [Raycast](https://raycast.com) extension for the Twos public API
(`https://writethingsdown.com/api/v1`).

## Commands

- **Add Thing** — add a to-do / note / hyperlink to a list (with a list dropdown).
- **Search Things** — search/browse your things; mark complete, open the list, copy, or open a hyperlink.
- **Create List** — create a new list.

## Auth

Set the **API Key** preference to a `twos_…` key from
**Twos → Settings → Advanced → API Keys** (sent as `Authorization: Bearer …`).

## Develop

```bash
cd extensions/twos
npm install
npm run dev        # ray develop — loads the extension into Raycast
```

## Publish (free)

1. Icon is already at `assets/extension-icon.png` (512×512, the current app icon).
2. `npm run build` then `npm run lint`.
3. `npm run publish` — opens a PR to the `raycast/extensions` store repo for review.

The Raycast Store is free to publish to.
