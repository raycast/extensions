# UI Component Search

Search and browse UI components across eight libraries from a single Raycast command:
**shadcn/ui**, **PrimeNG**, **Angular Material**, **spartan/ui**, **Taiga UI**, **Mantine**,
**React Spectrum**, and **Chakra UI**.

Results are grouped by library and can be filtered to a single library with the dropdown.
For each component you can open its documentation in the browser, copy its URL, or copy its name.

## How this compares to other extensions

This extension optimizes for **breadth** — one place to look up components across many
libraries — rather than depth in any single one. If you work primarily in one of the
libraries below, a dedicated extension will usually give you a richer, deeper experience
(inline docs, snippets, props, etc.), and you should reach for it:

| Library   | Dedicated extension                                                                                                               |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| shadcn/ui | [shadcn/ui](https://www.raycast.com/luisFilipePT/shadcn-ui) — includes a Search Components command                                |
| Chakra UI | [Chakra UI Documentation](https://www.raycast.com/pgvr/chakra-ui-docs) — includes a Search Components command                     |
| Mantine   | [Mantine UI Documentation](https://www.raycast.com/EmilMalanczak/mantine-documentation) — includes a Search Documentation command |

The remaining five libraries (PrimeNG, Angular Material, spartan/ui, Taiga UI, and
React Spectrum) are not currently covered by dedicated extensions, so this is the fastest
way to browse their components inside Raycast. Reach for this extension when you want a
single cross-library search; reach for the dedicated ones when you want to live in a
single library's docs.

## How the component lists are sourced

**For future maintainers:** component lists are fetched **live** from each library's public
documentation site at runtime, parsed, then cached locally for 24 hours
([`src/utils/cache.ts`](src/utils/cache.ts)). Seven providers also ship a **static fallback
list** used only when the live fetch fails (see [Failure handling](#failure-handling) below);
that fallback is never the primary source. Every library has its own provider under
[`src/providers/`](src/providers/), the shared fetch/cache/fallback flow lives in
[`src/providers/provider-helpers.ts`](src/providers/provider-helpers.ts), and all source URLs
live in [`src/constants.ts`](src/constants.ts).

If a library stops returning results, the docs site's markup almost certainly changed. Start
by opening that library's source URL below and comparing it against the parsing logic in the
corresponding provider file.

| Library          | Provider file                              | Source & parsing strategy                                                                                                       |
| ---------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| shadcn/ui        | `src/providers/shadcn-provider.ts`         | Scrapes `href` links off the [components docs page](https://ui.shadcn.com/docs/components)                                      |
| PrimeNG          | `src/providers/primeng-provider.ts`        | Scrapes links off the [PrimeNG site](https://primeng.org), with a static fallback list                                          |
| Angular Material | `src/providers/material-provider.ts`       | Scrapes the [component categories page](https://material.angular.dev/components/categories), with a static fallback list        |
| spartan/ui       | `src/providers/spartan-provider.ts`        | Scrapes the [components page](https://spartan.ng/components), with a static fallback list                                       |
| Taiga UI         | `src/providers/taiga-provider.ts`          | Parses [`sitemap.xml`](https://taiga-ui.dev/sitemap.xml) for `/components/{slug}` URLs, with a static fallback list             |
| Mantine          | `src/providers/mantine-provider.ts`        | Parses [`sitemap.xml`](https://mantine.dev/sitemap.xml) for `/core/{slug}` URLs, with a static fallback list                    |
| React Spectrum   | `src/providers/react-spectrum-provider.ts` | Scrapes a [component page](https://react-spectrum.adobe.com) sidebar, with a static fallback list                               |
| Chakra UI        | `src/providers/chakra-provider.ts`         | Scrapes the [components overview](https://chakra-ui.com/docs/components/concepts/overview) sidebar, with a static fallback list |

### Failure handling

Each library is fetched **independently and fails soft**: a markup change or network error in
one library never prevents the others from loading
([`fetchAllComponents()` in `src/hooks/use-components.ts`](src/hooks/use-components.ts) uses
`Promise.allSettled`). No degraded library is ever silently swallowed — there are two visible
states, and both cover network errors, non-OK HTTP responses, and parse failures alike:

**1. Failed** — the fetch produced no usable data at all (only shadcn/ui, which has no static
fallback). Surfaced by:

- A **"Failed to Load"** section listing each failed library with its error message.
- A red warning icon and a `(failed)` suffix on that library in the filter dropdown.
- A toast summarizing partial failures; if _every_ library fails, an error toast is shown.

**2. Using fallback data** — seven providers keep a **static fallback list** of known component
slugs (see the table above). When their live scrape fails, they serve that list so the group
stays populated, but the degraded status is **returned and cached alongside the components**
([`ProviderResult.source` in `src/types.ts`](src/types.ts)), so a broken scraper never hides
behind stale fallback data. The shared
[`fetchWithFallback()` helper](src/providers/provider-helpers.ts) applies this uniformly to
every fallback provider. Surfaced by:

- A **"Using fallback data"** subtitle on that library's section.
- A small yellow warning icon on each of its component rows (hover for details).
- A yellow warning icon and a `(fallback)` suffix on that library in the filter dropdown.
- A toast summarizing which libraries are on fallback data.

Because the source status is cached, a library that only ever shows the fallback state is a
signal to update that provider's scraping logic.

## Development

```bash
npm install
npm run dev     # run the extension in development
npm run lint    # lint
npm run build   # production build
```
