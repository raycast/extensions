# CRT Name

Find subdomains indexed by [crt.name](https://crt.name) and see when each hostname first appeared.

crt.name is a free subdomain index built from certificate transparency logs and related datasets. No API key is required.

## Search Apex

1. Run **Search Apex**.
2. Enter an apex domain such as `example.com` (URLs are accepted too).
3. Filter the list, then open a hostname or copy it.

Each result shows the date it first appeared in the crt.name index, or **Unknown** when that date is missing.

Use **Refresh Results** to bypass the local cache and fetch again.

## AI

Ask Raycast AI to search subdomains for an apex domain. You can filter by hostname text, sort by first-seen date or alphabetically, and limit how many names are returned.

The tool is read-only. It does not probe DNS or check whether a host is reachable.

## Notes

- Results are passive index records. A listed hostname may not currently resolve, and listing does not prove current ownership.
- Dates are first-seen in the index, not certificate metadata.
- crt.name allows 1,000 free requests per IP per day.
