<div align="center">
    <br/>
    <br/>
    <img src="./assets/extension_icon.png" alt="Chromium Extensions Audit" width="100"/>
    <h3>Chromium Extensions Audit</h3>
    <p>Audit browser extensions and track permission changes</p>
    <br/>
    <br/>
</div>

Chromium Extensions Audit is a Raycast extension that helps you inspect installed Chromium browser extensions, understand their permissions, and track changes across browsers and profiles. All scanning and history storage stay on your Mac.

## Browsers

The scanner automatically checks these default macOS locations under `~/Library/Application Support/`:

| Browser              | User-data directory           |
| -------------------- | ----------------------------- |
| Google Chrome        | `Google/Chrome`               |
| Dia                  | `Dia/User Data`               |
| Arc                  | `Arc/User Data`               |
| Brave                | `BraveSoftware/Brave-Browser` |
| Microsoft Edge       | `Microsoft Edge`              |
| Vivaldi              | `Vivaldi`                     |
| Chromium             | `Chromium`                    |
| Google Chrome Beta   | `Google/Chrome Beta`          |
| Google Chrome Canary | `Google/Chrome Canary`        |

Missing or empty browser directories are skipped. Inaccessible data is reported without blocking other browsers. Default-location data can remain after a browser is uninstalled; scanning does not establish whether the browser is currently running. Custom `--user-data-dir` locations are not discovered automatically.

Use the filter dropdown to choose a browser, one of its profiles, and a finding/state filter. The same extension in different browsers has separate observations, baselines, events, and review status. Existing Chrome history is preserved when other browsers are first discovered.

## Commands

- **Browser Extensions** — searchable inventory, browser/profile/finding filters, a risk level and layered findings for each extension, requested/approved/active/runtime/effective access, change evidence, review actions, and report export.
- **Extension Changes** — menu-bar monitoring with a best-effort hourly refresh. The count represents unreviewed actionable **events**, not extensions or static findings.

Open Browser Extensions to establish a baseline for each successfully scanned profile. Existing capabilities do not create change alerts. Open Extension Changes once to activate monitoring. Background refresh must remain enabled in Raycast, and Raycast must be running. Scan timestamps and coverage are available in Audit Status.

## Understanding access

Requested access is not granted access. Chromium's `active_permissions` preference records desired active configuration; it is not, on its own, proof of executable access. The scanner combines declared capabilities, approved permissions, desired active configuration, persistent runtime grants, site withholding, and enabled state.

- A disabled extension retains its configured grants but has no reported executable access.
- An all-sites request with withheld access does not become an all-sites finding.
- `activeTab` is conditional. Temporary in-memory grants cannot be reconstructed from files.
- Missing, conflicting, unsupported, or malformed metadata is shown as uncertain.
- Browser-wide site-access overrides cause conservative uncertainty until their browser context can be verified.
- Content-script paths, exclusions, and globs can narrow matching pages. Patterns shown for scripts are an upper bound where these restrictions exist.
- Restricted browser pages, enterprise policy, and runtime browser restrictions still apply.

Findings describe capabilities and provenance, not malware probabilities. No numeric score is used. A capability is not evidence of actual use.

Findings are grouped into three layers: **Security** (running code, network and browser control), **Privacy** (access to cookies, requests, settings, and search), and **Trust** (installation source, blocklist and file-verification state, legacy manifests, and purpose mismatch). Each layer is rated **High**, **Medium**, **Low**, or **None** from its findings: Review now is High, Review is Medium, and Informational is Low. Heuristic findings (partial confidence, such as code-analysis patterns) count one level lower. The overall risk is the highest layer. Risk levels rate recorded capabilities and provenance; they are not malware probabilities or safety ratings. The list sorts extensions with unreviewed urgent changes first, then by risk.

Search, homepage, and startup-page overrides apply without a permission prompt, so they are reported separately, and an update that adds one is flagged for prompt review. The purpose-mismatch heuristic flags extensions that describe themselves as cosmetic (themes, fonts, wallpapers, new tab pages) but hold unrelated capabilities such as cookies, history, clipboard, or network control.

## Review workflow

1. Run **Browser Extensions** and inspect Audit Status for baseline and coverage information.
2. Inspect an extension to see access evidence and its timeline.
3. Use **Change History** to review all events, including informational updates and removals.
4. Mark individual changes, an extension's changes, or all current actionable changes reviewed. This preserves history and does not change browser configuration.
5. Use **Scan Again** at any time.
6. Use **Export Report as Markdown** or **as JSON** to save a summary of every extension, its risk levels, and its layered findings to `~/Downloads`. Existing reports are never overwritten.

**Open Browser Extension Settings** targets the owning browser and copies the extension ID. Chrome, Brave, Edge, Vivaldi, and Chromium receive a profile-directory argument, which an already-running browser may ignore. Arc and Dia open their extension settings without assuming that Chromium profile flags work in their app wrappers. Always verify the selected profile and use the copied ID if necessary. No action claims that profile selection succeeded. Store links distinguish Chrome Web Store and Edge Add-ons when the recorded source identifies them.

## Code analysis

**Code Analysis** is off by default. Enable it in the extension preferences to read each extension's installed files inside its version folder. Files are hashed and pattern-matched locally; they are never executed or uploaded, and symbolic links are not followed. Every file is hashed, up to 20,000 files and 1 GB per extension; reaching either limit, or finding a symbolic link, marks the analysis partial. Script files over 16 MB are hashed but not pattern-checked.

- **Loads code from remote servers** (Review now): `importScripts`, script elements, or HTML script tags pointing at remote URLs.
- **Obfuscated code** (Review): identifiers typical of JavaScript obfuscators. Minification alone does not match.
- **Dynamic code evaluation** (Informational, or Review alongside remote code): `eval`, `new Function`, or string timers.
- **Large encoded data** (Informational): long high-entropy strings that are not image or font data.
- **Referenced remote hosts**: hosts found in code, excluding common specification and documentation hosts. A referenced host is not proof of a connection.

Code findings use partial confidence because patterns can match unused library code. With analysis enabled, a scan also records a hash of every file. Code that changes without a version increment is flagged for prompt review, as are new remote-code or obfuscation patterns after an update; new referenced hosts are flagged for review. Comparisons use the last successful code analysis, even across failed or partial scans. Turning analysis on for the first time never creates change events.

## Privacy and storage

The scanner reads each browser's `Local State`, `Last Version`, extension portions of `Preferences` and `Secure Preferences`, manifests, localization messages, and local icons. It never writes browser files or opens history, cookies, or password databases. Extension JavaScript is read only when **Code Analysis** is enabled. No inventory telemetry, account, backend, or remote enrichment is implemented. The store-listing action opens a public listing only when you choose it. Reports are written locally, with private file modes, only when you export one.

Audit data is stored in the extension-owned Raycast support directory under `audit/`, with private filesystem modes. Writes use a cross-process lock, schema validation, and an atomic file replacement. Unreadable manifests keep the affected extension's previous observation while healthy entries remain usable. Invalid profile preferences preserve the whole profile snapshot; a missing profile never implies that all of its extensions were removed.

- Original baselines: until explicitly reset.
- Last successful access observation: until the extension is removed or the baseline is reset.
- Last successful code analysis: until the extension is removed or the baseline is reset.
- Changed snapshots: 90 days.
- Reviewed and informational events: 180 days.
- Unreviewed actionable events: retained until reviewed.

**Reset Baseline** asks for confirmation and keeps one local `audit-before-reset.json` backup. A corrupt, missing previously initialized, or unsupported store requires this explicit reset; it never silently invents history. Uninstalling and deleting the entire support directory removes the initialization marker too, so a subsequent installation starts fresh.

## Scope

The extension targets macOS and the browsers listed above. All adapters share conservative Chromium preference parsing. The engine version from `Last Version` controls schema interpretation; a fork's product version (for example, Dia 1.x) is never substituted for a Chromium version. Unsupported or missing engine metadata remains uncertain.
