<div align="center">
    <br/>
    <br/>
    <img src="./assets/crt-name-icon.png" alt="CRT Name" width="100"/>
    <h3>CRT Name</h3>
    <p>Find subdomains indexed by crt.name and see when each one first appeared</p>
    <br/>
    <br/>
</div>

Find subdomains indexed by [crt.name](https://crt.name) and see when each hostname first appeared.

crt.name is a free subdomain index built from certificate transparency logs and related datasets. No API key is required.

## Search Apex

1. Run **Search Apex**.
2. Enter an apex domain such as `example.com` (URLs are accepted too).
3. Choose **First Seen: Oldest First**, **First Seen: Newest First**, or **Alphabetical** from the sort menu.
4. Filter the list, then open a hostname or copy it.

Use **Copy All Subdomains** to copy every unique name returned for the apex, one per line, in the selected sort order. This includes the apex if the index returns it and preserves wildcard patterns. Filtering and the 100-row display pages do not limit the copied names; URLs and dates are not included.

Each result shows its earliest available first-seen date in the crt.name index, in UTC, or **Unknown** when the date is missing or invalid. Date sorting uses the full timestamp, with alphabetical ties and unknown dates last in both directions. Duplicate names are combined case-insensitively, retaining their earliest valid timestamp.

Use **Refresh Results** to bypass the local cache and fetch again.

## AI

Ask Raycast AI to search subdomains for an apex domain. You can filter by hostname text, sort by first-seen date or alphabetically, and limit how many names are returned.

The tool is read-only. It does not probe DNS or check whether a host is reachable.

## Notes

- Results are passive index records. A listed hostname may not currently resolve, and listing does not prove current ownership.
- **First seen** is the index timestamp supplied by crt.name. Its [index documentation](https://crt.name/#index) describes CT logs alongside other datasets and probing; the API does not expose certificates or issuance timestamps. It does not establish when a domain was created, registered, or first used. Missing dates and incomplete source coverage limit historical conclusions.
- Wildcard patterns (such as `*.example.com`) are kept distinct from the apex and concrete hostnames. They can be copied, but are not offered as browsable URLs.
- crt.name currently documents 100 free requests per IP per day. Results are cached locally for 15 minutes.
