# AsafAmos — Accessibility Scanner

Scan any URL for WCAG 2.1 / 2.2 AA violations without leaving Raycast.

## Commands

- **Scan URL for Accessibility** — enter a URL, run the scanner, and browse a filterable list of violations with severity and affected-element counts. Open any row for the offending HTML and a link to the WCAG reference. Use the action panel to open the Hebrew accessibility statement generator or the full web report.

## Under the hood

Scans are performed by the public Axle API at `https://axle-iota.vercel.app/api/scan`. No Raycast account or API key is required. The extension sends the URL you enter to that service for analysis.

The free tier is rate-limited. For unlimited AI-powered fixes, use the Axle web UI or CLI with your own `ANTHROPIC_API_KEY`.

If the API is unavailable or rate-limited, the scan command shows an error with the message returned by the service.

## Install

Once listed in the Raycast Store, search for "accessibility scanner".

## Dev

```bash
npm install
npm run dev
```
