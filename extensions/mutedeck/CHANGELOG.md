# Changelog

## [Fix commands failing when not in a meeting] - 2026-08-03

- Fixed all four commands failing with "Invalid API response format" whenever no meeting was active. MuteDeck 4.x reports `call: "inactive"`, but the status validator only accepted `call` being absent or `"active"`, so `getStatus()` threw before any command could run.
- Unrecognized `control` platforms are now logged and allowed through instead of failing validation, so a future MuteDeck release adding a conference app cannot break every command the same way. A non-string `control` is still rejected.

## [Initial Version] - 2025-03-02

- Initial version of the MuteDeck extension
