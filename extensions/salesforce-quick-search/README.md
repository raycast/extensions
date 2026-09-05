# Salesforce Quick Search

Search Salesforce from Raycast — no API access, no admin setup, no configuration beyond your instance domain. The command simply builds a Salesforce Lightning URL and opens it in your default browser, so your existing browser login session handles authentication.

## Setup

The only preference is your **Salesforce Instance Domain** — your My Domain host, e.g.:

```
mycompany.lightning.force.com
```

You'll be prompted for it the first time you run the command. Pasting a full URL (`https://mycompany.lightning.force.com/`) also works; the extension strips the scheme and path.

## Usage

- **Search Salesforce** with a query → opens Salesforce global search results for that term.
- **Search Salesforce** with no query → opens the Lightning home page.

## How it works

With a query, the extension builds a `forceSearch:searchPageDesktop` component payload:

```json
{
  "componentDef": "forceSearch:searchPageDesktop",
  "attributes": {
    "values": {
      "term": "<your query>",
      "scopeMap": { "type": "TOP_RESULTS" },
      "context": {
        "disableSpellCorrection": false,
        "SEARCH_ACTIVITY": { "term": "<your query>" }
      }
    }
  },
  "state": {}
}
```

…base64-encodes it, and opens:

```
https://<instance>/one/one.app#<encoded payload>
```

This is an undocumented but long-stable Lightning URL format. If Salesforce ever changes it, the payload in `src/search.ts` is the only thing to update.

## Development

```bash
npm install
npm run dev    # imports the extension into Raycast in dev mode
npm run build  # validates and builds without publishing
```
