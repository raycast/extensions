# NicheFund Business Ideas for Raycast

Browse NicheFund's latest public MicroSaaS idea teardowns without leaving your keyboard. The extension requires no account, token, or configuration.

## Commands

- **Latest Teardowns** — searchable, paginated teardown list with category filtering.
- **Teardown of the Day** — opens the latest published teardown in a compact detail view.
- **Random Business Idea** — previews one validated opportunity and its target audience, with the full solution and monetization strategy available in NicheFund.

Every result offers a useful preview plus a relevant next step: read the full teardown, explore and filter validated ideas with a free account, or copy the insight for later. Links include `utm_source=raycast` so registrations can be measured.

## Development

```bash
npm install
npm run dev
```

Validate a release build with `npm run lint` and `npm run build`.

## Privacy

The extension requests public teardown metadata or one random free-preview idea from `https://nichefund.app`. It does not collect credentials and does not require authentication. Browser links include campaign parameters for aggregate attribution. Random idea requests are rate-limited by NicheFund.
