# WHMCS Client Search Changelog

## ["Open Support Ticket" Option] - {PR_MERGE_DATE}

- You can now open a support ticket for your selected client by hitting `CMD + T`.

## [Better Search, Better Sync] - 2025-08-27

- We can now search `{$firstname} {$lastname}` instead of searching those fields separately.
- Client Sync now only syncs Clients whose status is "Active" by default. Use `CMD + Return` to sync all clients regardless of status.
- 🐞 BUGFIX: Ensuring client list is shown whenever Client Search is called.

## [Initial Release] - 2025-08-20

Initial release with:

- Client Sync for creating a local clients.json.
- Client Search with "fuzzy" searching across name, company, and email fields.
- Quicklinks to Client Profiles and Billable Items. 