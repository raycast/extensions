# Kobbe for Raycast

Inspect Kobbe analytics from Raycast. Search your sites, view overview metrics, check top pages, and review revenue without opening the dashboard.

## Setup

Create an API token in Kobbe before using the extension:

1. Open Kobbe.
2. Go to Account -> Agent access.
3. Create a token named `Raycast`.
4. Enable these scopes:
   - Read sites
   - Read analytics
   - Read revenue
5. Copy the token. It starts with `kbpat`.

Then open a Kobbe command in Raycast and set the extension preferences:

- API Token: your `kbpat...` token
- Kobbe Base URL: `https://app.kobbe.io`
- Default Range: usually `Last 7 days`

## Commands

- Search Sites: list your Kobbe sites and open the dashboard.
- Site Overview: view traffic, engagement, revenue, and top pages.
- Top Pages: inspect the highest-traffic pages for a site.
- Revenue: view revenue totals with page and source context.

## Security

Use the smallest set of scopes you need. For this extension, read-only access is enough. If a token is exposed, revoke it in Kobbe and create a new one.
