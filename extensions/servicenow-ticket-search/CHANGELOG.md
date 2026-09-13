# ServiceNow Ticket Search Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Search ServiceNow tickets by number across five record types: incidents
  (`INC`), change requests (`CHG`), demands (`DMND`), enhancements (`ENHC`),
  and request items (`RITM`).
- Accepts a full ticket number (`INC0012345`), a bare number (`12345`, which
  offers every type), or a partial prefix (`INC`) to filter the list.
- Short numbers are zero-padded to ServiceNow's 7-digit record width, and the
  padded number is shown in the list before you open it.
- Opens each ticket against its own ServiceNow table, so links resolve
  reliably rather than relying on a generic number lookup.
- Copy the ticket number (⌘C) or its full URL (⌘⇧C) to the clipboard.
- Configurable instance URL that tolerates a pasted full URL, surrounding
  whitespace, and trailing slashes.
