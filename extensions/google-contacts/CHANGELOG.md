# Google Contacts Changelog

## [1.0.1] - 2026-04-13

- Fix `search` operation timing out (600s max) when the AI tool is called without a query — now returns a single page of contacts instead of paginating the entire address book

## [Initial Release] - 2026-04-03

- Search Contacts with List, Detail, and Grid view modes
- Create Contact form with primary and additional fields
- Quick Add Contact from the command bar
- Edit and delete contacts with confirmation
- Google Contacts AI tool for Raycast AI
- Google OAuth PKCE authentication (bring your own Client ID)
