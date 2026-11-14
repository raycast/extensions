# Privatus Analytics for Raycast

Check how your websites are doing without opening a browser.

Most analytics tools need a cookie pop-up, and many visitors leave when they see one. Bots also fill your numbers with fake visits. [Privatus Analytics](https://privatusanalytics.com) counts real people without cookies, so you need no pop-up and you get numbers you can trust.

This extension puts those numbers one keystroke away.

## Commands

- **Check Website Stats**: see every site with its visitors in the last 30 days, a small chart of the last 14 days and how many people are on it right now. Open a site to see visitors, visits, pageviews, bounce rate, visit time and revenue, compared with the period before. You also get the top pages, top referrers and top countries. Pick Today, Last 24 Hours, Last 7 Days, Last 30 Days, Month to Date or Last 12 Months.
- **Show Live Visitors**: shows the number of people on your sites right now in the menu bar. It updates every 5 minutes. Click a site to open its dashboard.
- **Open Dashboard**: opens Privatus Analytics in your browser.

Each site also has quick actions to copy its site ID or its tracking code.

## Setup

1. Sign up at [privatusanalytics.com](https://privatusanalytics.com/users/sign_up). The free plan has 10,000 events a month and 3 sites, with no card needed.
2. Add your site and paste the tracking code into your pages.
3. In Privatus Analytics, go to **Workspace settings**, then **API tokens**, and create a token that can read analytics. It starts with `pat_`.
4. Run any command in Raycast and paste the token when asked.

The token stays on your computer in Raycast's settings. It is only sent to `privatusanalytics.com`.

## Develop

```sh
npm install
npm run dev     # opens the extension in Raycast
npm test        # unit tests, no Raycast needed
npm run build
```

Set `PRIVATUS_TOKEN=pat_...` before `npm test` to also run a quick check against the real API.

The extension uses the [Privatus Analytics JSON API](https://privatusanalytics.com/docs/api).

## License

MIT, see [LICENSE](LICENSE).
