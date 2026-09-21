# UI Component Search Changelog

## [Fixes] - 2026-09-16

- Fix PrimeNG component fetching: read the list from the showcase sidebar menu data on GitHub, since primeng.dev is client-rendered
- Fix Angular Material component fetching: read the list from the docs `documentation-items` registry on GitHub, since material.angular.dev exposes no component links in its HTML
- Fix Taiga UI component fetching: read the list from the demo app route registry on GitHub, since taiga-ui.dev no longer serves a usable sitemap

## [Initial Version] - 2026-09-08

- Search and browse UI components across shadcn/ui, PrimeNG, Angular Material, spartan/ui, Taiga UI, Mantine, React Spectrum, and Chakra UI
- Filter results by a single library or view all libraries grouped into sections
- Open a component in the browser, copy its URL, or copy its name
- 24-hour local cache with parallel, fault-tolerant fetching across libraries
