# WHMCS Client Search Changelog

## [Better Sync Errors] - 2026-06-11

- Client Sync failures now show the actual error returned by your WHMCS install (e.g. "Invalid IP x.x.x.x") instead of a bare HTTP status, with a "Copy Error" action.
- 403 errors now include guidance pointing to WHMCS's API IP Access Restriction setting.
- When a sync fails, the Client Search window opens with the full error message and actions to copy the error or retry the sync. For IP-restriction errors, copying the offending IP address becomes the default action (`Return`), with the full error on `CMD + Return`.

## ["Open Support Ticket" Option] - 2025-12-10

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