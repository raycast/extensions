# Changelog

## Initial Version - 2026-10-29

- Discover extensions across Chrome, Dia, Arc, Brave, Edge, Vivaldi, Chromium, Chrome Beta, and Chrome Canary profiles, and inspect requested, approved, active, withheld, and observable effective access.
- Explain sensitive capabilities, installation sources, disabled states, and incomplete evidence.
- Create a local baseline, detect permission and configuration changes, and preserve reviewed history.
- Monitor unreviewed actionable changes from the menu bar with best-effort hourly scans.
- Open browser settings with profile guidance, copy extension IDs and findings, and recover from incomplete scans without false removals.
- Group findings into Security, Privacy, and Trust layers with High, Medium, Low, or None risk per layer and overall, and export Markdown or JSON audit reports.
- Detect search, homepage, startup-page, and browser-page overrides, cosmetic extensions with unrelated capabilities, blocklist states, and failed file verification.
- Optionally analyze installed extension code locally for remote code loading, obfuscation, dynamic code, encoded payloads, and referenced hosts, and flag code that changes without a version update.
- Prevent code analysis from stalling on large bundles and extensions containing many files, and enforce the read budget for oversized files.
- Preserve code-change detection across failed or partial scans.
- Filter by browser and profile, keep each browser's history separate, and open settings in the correct browser with store-specific listing links.
