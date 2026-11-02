# Sharply Gear Search

Search public photography gear and press Enter to open the selected Sharply page. No account or API key is required.

## Usage

Open Raycast and run **Search Gear** (subtitle: Sharply). Type a brand or model name, use the arrow keys to select a result, and press Enter.

When the search is blank, **Recently Opened** shows your last 10 unique gear pages opened through this command, newest first. Reopening an item moves it to the top. History is stored locally in Raycast and keeps the thumbnail and price from the last open. Browser history and copied links are not included.

For quicker access, assign the command an alias such as `gear` or a hotkey in Raycast Settings → Extensions. Raycast opens the command's search view; typing in the global launcher alone does not index all Sharply gear.

The command searches after at least two characters, throttles typing, caches query results between launches, and preserves Sharply's ranking. The subtitle beside the gear name shows the typical estimated used price for the selected market (shown as `~$…`) when available and stays blank otherwise, with no MSRP fallback. It shows up to 25 matches; refine your query for a more specific item. Enter opens the gear page; the action menu also provides Copy Gear Page Link, Refresh Results (⌘R), and Search Sharply Website.

## Privacy and limits

Searches are sent anonymously to sharplyphoto.com; no account, API key, or personal data is sent. Requests time out after 15 seconds. If Sharply rate-limits a search or shows a security check, the extension shows an error with a link to search on the website instead.

## Price market

In Raycast Settings → Extensions → Sharply Gear Search, choose **Price Market**: US (USD, default), UK (GBP), or EU (EUR). Market selection is explicit; the extension does not detect your macOS locale or location. Open Extension Preferences is also available in the action menu.

Prices use each market’s own estimate, without currency conversion or cross-market fallback. When an estimate is missing, the subtitle stays blank. New recent opens retain all three markets so switching preferences updates their prices.
