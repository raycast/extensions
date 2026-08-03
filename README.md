# NicheFund Teardowns for Raycast

Browse NicheFund's latest public MicroSaaS idea teardowns without leaving your keyboard. The extension requires no account, token, or configuration.

## Commands

- **Latest Teardowns** — searchable, paginated teardown list with category filtering.
- **Teardown of the Day** — opens the latest published teardown in a compact detail view.
- **Random Business Idea** — fetches one validated idea from NicheFund's free-preview range.

Actions open the full public article, copy its link or title, or open NicheFund's free registration page. Links include `utm_source=raycast` so registrations can be measured.

## Development

```bash
npm install
npm run dev
```

Validate a release build with `npm run lint` and `npm run build`.

## Privacy

The extension requests public teardown metadata or one random free-preview idea from `https://nichefund.app`. It does not collect credentials and does not require authentication. Browser links include campaign parameters for aggregate attribution. Random idea requests are rate-limited by NicheFund.
