# MyIP Changelog

## [Rewrite the IP view] - {PR_MERGE_DATE}

- Replace the list view with a two-line Internal IP / External IP view.
- Press Enter to copy the external IP; press Cmd+Enter to copy the internal IP.
- Remove the IP Lookup and Torrent History actions.
- Keep the IP in Menu Bar command.
- Show IPv4 only in the main view; IPv6 remains available in the menu bar.

## [Improve README] - {PR_MERGE_DATE}

- Rewrite the README to explain what each command does.

## [Update] - 2026-06-11

- Remove unused ip dependency (clears CVE-2024-29415)

## [Update] - 2026-06-01

- Add "IP in Menu Bar" command to display your IP address in the macOS menu bar

## [Update] - 2025-09-15

- Add Windows support
- Typescript fixes
- Display IPV4 details even when using IPV6
- Bump deps
- Use newest eslint config

## [Update] - 2025-02-21

- Redesigned the icon to be more consistent with the Raycast style and better looking

## [Update] - 2024-12-06

- Updated metadata images

## [Update] - 2024-11-25

- Add display multiple local IPs with index in accessories

## [Update & refactor]

- Remove `axios`, rewritten fetch using `node-fetch` & `@raycast/utils`
- Bugfix where ip lookup was not working properly (#11290)
- Updated dependencies

## [Update] - 2023-03-11

- Fixed IP Lookup not working
- Remove obsolete code

## [Update] - 2023-03-10

- Made local ip copiable regardless of whether the public ip is successfully obtained
- Migrate to the latest raycast api version

## [Added Additions] - 2022-03-17

- Added local-ip list items
- Updated the raycast api version.
