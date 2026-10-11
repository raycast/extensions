# Sharply for Raycast

Search public photography gear and press Enter to open the selected Sharply page. No account or API key is required.

## Install locally

1. Clone this repository and open a terminal in its folder:

   ```sh
   git clone https://github.com/nyphotohouse/sharply-raycast.git
   cd sharply-raycast
   ```

2. Run `npm install`, then `npm run dev` to import the command into Raycast.
3. Open Raycast and run **Search Gear** (subtitle: Sharply).
4. Type a brand or model name, use the arrow keys to select a result, and press Enter.

When the search is blank, **Recently Opened** shows your last 10 unique gear pages opened through this command, newest first. Reopening an item moves it to the top. History is stored locally in Raycast and keeps the thumbnail and price from the last open. Browser history and copied links are not included.

For quicker access, assign the command an alias such as `gear` or a hotkey in Raycast Settings → Extensions. Raycast opens the command's search view; typing in the global launcher alone does not index all Sharply gear.

The command searches after at least two characters, throttles typing, caches query results between launches, and preserves Sharply's ranking. The subtitle beside the gear name shows the typical estimated used price for the selected market (shown as `~$…`) when available and stays blank otherwise, with no MSRP fallback. It shows up to 25 matches; refine your query for a more specific item. Enter opens the gear page; the action menu also provides Copy Gear Page Link, Refresh Results (⌘R), and Search Sharply Website.

## API behavior

Requests go directly to `https://www.sharplyphoto.com/api/search` with `q`, `page=1`, `pageSize=25`, and `includeTotal=false`. It uses the same anonymous endpoint as the website. No credentials or embedded API keys are sent. Searches support the website's model and alias matching.

The website endpoint is not a versioned developer API contract. Coordinate changes with Sharply if distributing the extension. Keep anonymous search narrowly scoped, with server-side limits and rate controls as needed. Requests time out after 15 seconds. Security checkpoints and rate limits show an error with a website search action; the extension does not attempt to bypass them.

Full search provides estimated used prices and thumbnails that the suggestions endpoint currently omits.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development, contribution sync, and Store release workflow.

- `npm run build` — build and validate the command.
- `npm run lint` — Raycast lint checks.
- `npm run typecheck` — TypeScript checks.
- `npm test` — public request, response validation, and error handling tests.

The extension icon is copied from Sharply's favicon. This extension is separate from the Next.js application and needs no Sharply server changes.

## Price market

In Raycast Settings → Extensions → Sharply Gear Search, choose **Price Market**: Automatic (default), US (USD), UK (GBP), or EU (EUR). Automatic reads the macOS Language & Region setting locally: GB selects UK, EU member countries select EU, and all other or unreadable regions select US. It does not use IP location. Open Extension Preferences is also available in the action menu.

Prices use each market’s own estimate, without currency conversion or cross-market fallback. When an estimate is missing, the subtitle stays blank. New recent opens retain all three markets so switching preferences updates their prices. Older history contains only US prices until the items are reopened from search.
