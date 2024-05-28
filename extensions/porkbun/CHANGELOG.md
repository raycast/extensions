# Porkbun Changelog

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
