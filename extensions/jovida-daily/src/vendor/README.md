# Vendored code

`jovida/` contains the pure client logic (HTTP client, session/device-flow,
snapshot sync, and the domain conversion/recurrence helpers) vendored from the
official [`@fluxvita/jovida-cli`](https://www.npmjs.com/package/@fluxvita/jovida-cli)
(MIT, © FluxVita), currently synced from **v0.0.17** (adds due-cache hooks:
`writeSnapshotCache`/`invalidateSnapshotCache`/`getServerVersion`; `whoami()`
fields renamed `vitaId`→`userId`, `vitaHao`→`jovidaId`, `entitlement` dropped).

It is vendored — rather than spawned as a binary or installed at runtime — so the
extension is self-contained, reviewable, and requires nothing to be pre-installed.
The file-based storage and machine-id modules from the CLI are intentionally NOT
vendored; this extension supplies store-clean replacements (`config.js`,
`state.js`) backed by Raycast `LocalStorage` and a random device id.
