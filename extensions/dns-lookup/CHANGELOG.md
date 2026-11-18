# DNS Lookup Changelog

## [Classic DNS Fallback] - 2026-10-21

- Added a **Fast Check Transport** preference: Auto (DoH with fallback to classic DNS on UDP port 53), DoH only, or classic DNS only.
- Added a **System DNS** row that queries the resolver configured on your machine.
- Fast Check results now show the transport that answered them (DoH or UDP).
- Redesigned results: compact rows with the first record and a `+N` badge, and a detail panel (`⌘D`) listing every record with the resolver or probe information.
- Added an indicator telling whether all resolvers or probes return identical answers.
- Fast Check rows now show the provider logos.
- Added an optional `domain` argument to start a Fast Check from the root search.
- Fixed Fast Check rows staying stuck in a loading state when a provider timed out.
- Fixed Global Check using the previous record type after changing it in the dropdown.
- Fixed Global Check reporting "No records found" for probes that had not answered yet.
- NXDOMAIN and SERVFAIL answers are now reported instead of "No records found".
- Fixed TXT records containing commas being split into several records.
- Added Windows keyboard shortcuts and updated to Raycast API 2.

## [Initial Version] - 2026-02-16
