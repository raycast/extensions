# Porkbun Changelog

## [Domain Pricing Enhancements] - 2025-03-24

- `Domain Pricing` command would sometimes return invalid JSON and crash (ref: [Issue #18072](https://github.com/raycast/extensions/issues/18072))
- `Domain Pricing` now shows "specialType" of domain (if exists)
- Modernize extension: `chore` and more

## [Fix Domain Pricing Crashing] - 2024-09-03

- `Domain Pricing` command would crash if user tried to reload too many times. The "Reload Domain Pricing" action is now hidden if already fetching.

## [Labels in Domains + Update API hostname] - 2024-07-25

- Labels applied in Porkbun dashboard to domains will now be fetched
- new `usePorkbun` hook that uses Raycast's `useFetch` to improve handling of some endpoints
- update deps

## [Fix open in browser command for domain items] - 2024-03-14

### Fixes

- Include HTTPS protocol when opening domains

## [IPv4 + Retrieve All Domains endpoint] - 2023-11-13

### Enhancements

- Force IPv4 via Preferences
- No need to manually enter domains for most commands as Domains are fetched and populated using cached Domains from "Retrieve All Domains"
- Better Error Handling using a separate Error Component

### New Endpoints

- Retrieve All Domains
    - Get Name Servers
    - Update Name Servers
    - Get URL Forwarding
    - Add URL Forwarding
    - Delete URL Forwarding

## [Initial Version] - 2023-04-15
