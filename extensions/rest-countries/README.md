# REST Countries

Search and explore detailed data for every country: flags, capitals, languages, currencies, regions and more, powered by the [REST Countries](https://restcountries.com) API.

## Setup

This extension requires a free REST Countries API key.

1. Go to [restcountries.com/sign-up](https://restcountries.com/sign-up) and create an account to get your API key.
2. Open the extension in Raycast. On first launch you'll be asked for two preferences:
   - **API Key** — paste the key from step 1.
   - **Show Countries** — choose whether to include partially-recognized territories that have no ISO 3166-1 code (e.g. Abkhazia, South Ossetia, Northern Cyprus). This is based purely on the data source's ISO codes and is not a political stance.

That's it — you're ready to go.

## Commands

### Search Countries

Browse and search every country from Raycast. Type a name, capital, or language to filter, and toggle the detail panel to see a country's flag, official name, capital, region, population, area, languages, currencies, calling code, timezones, organisation memberships, and more.

Useful actions: open the country in Google Maps / Wikipedia / OpenStreetMap, copy its name, ISO code, flag emoji, or the raw JSON, and refresh to pull fresh data.

## AI Extension

This extension is AI-enabled. Mention `@REST Countries` in Quick AI, AI Chat, or AI Commands and ask in natural language. It exposes three tools:

- **Find Countries** — free-text lookups (by name, capital, language, currency, top-level domain, and more).
- **Get Country** — details about one specific country by name, ISO code, or capital.
- **List Countries** — countries matching criteria like region, subregion, language, currency, landlocked status, or organisation membership (EU, NATO, UN, Schengen, …).

### Example prompts

- `@REST Countries compare Japan, Switzerland, and Canada — capital, population, currency, and languages`
- `@REST Countries which EU countries are landlocked?`
- `@REST Countries what are the 5 smallest countries in Europe by area?`
- `@REST Countries which country has Canberra as its capital?`

## Notes

- Results are cached locally for 4 hours, so repeated browsing and searches don't exhaust your API quota. But you can refresh manually.
- Data is provided by the [REST Countries](https://restcountries.com) API via the [`@yusifaliyevpro/countries`](https://www.npmjs.com/package/@yusifaliyevpro/countries) SDK.
