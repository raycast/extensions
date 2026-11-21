# Pomme Versions Changelog

## [Initial Version] - {PR_MERGE_DATE}

### OS versions

- Lists the latest release of every major version of macOS, iOS, iPadOS, watchOS, tvOS, and visionOS, using data from [SOFA](https://sofa.macadmins.io/).
- Each row shows the version, build, release date, CVE count, and an "Exploited" tag when the release fixes actively exploited vulnerabilities.
- iOS and iPadOS get separate sections. They share data because SOFA publishes them as a single release.
- Releases without a build in SOFA (e.g. visionOS 2.6) show "No build listed".
- Each OS has an SF Symbol icon with light and dark theme variants.
- You can filter the list by version or build number.

### Details and actions

- The detail panel (⌘D) shows the version, all builds, the release date, the CVE count, the actively exploited CVEs, links to Apple's security notes and SOFA, and when the data was last updated.
- Actions: Copy Version, Copy Build or All Builds (⌘⇧C), Copy Exploited CVE IDs (⌘⇧E), Open Apple Security Notes (⌘O), Open in SOFA (⌘⇧O), Refresh (⌘R), and Configure Extension (⌥⌘,).
- The "Earlier Releases…" submenu (⌘⇧H) lists previous releases of each version with their release dates. Each one can be copied or its security notes opened, and device-specific releases are labeled.

### CVEs

- Show CVEs (⌘⇧V) lists a release's patched CVEs, exploited ones first, with a search box, severity and CISA KEV tags, and links to NIST.
- Search CVE (⌘⇧F) searches every CVE across all OS versions and shows which releases fix it.

### Downloads

- Download Firmware… (⌘⇧D) lists the restore images (.ipsw) for a version from [ipsw.me](https://ipsw.me), grouped by the devices that share them, with signing status and size. Downloads are checked against their SHA-256.
- For macOS, Download Installer Package (⌘⇧I) saves Apple's full `InstallAssistant.pkg`. Opening it puts the "Install macOS" app in Applications. No administrator password is needed.
- Both download actions are also available on each entry in Earlier Releases.
- The Pomme Downloads command, also available as Show Downloads (⌥⌘L), lists every download with live progress. From there you can cancel, retry, show it in Finder, open its log, or remove it, which also deletes any partial data. Clear Download History (⌃⇧X) empties the list, and Move All Downloaded Files to Trash deletes the files the extension saved. Both ask first.
- Downloads run in the background, so they keep going after Raycast closes. They resume if interrupted. While the command is open, a toast shows progress and can cancel the download.

### Preferences

- Primary Action chooses what Enter does: Copy Version, Copy Build, Show CVEs, Search CVE, Open Apple Security Notes, or Open in SOFA.
- Refresh Data chooses how often SOFA data is downloaded: every time the command opens, or only when the saved data is older than 1, 4, or 12 hours, or a day. Refresh (⌘R) always updates immediately.
- Download Location chooses where firmware and installers are saved (default `~/Downloads`).

### Security

- Links from the feed are only opened when they are `https` on the host the UI names (`support.apple.com`, `nvd.nist.gov`). Other NIST links fall back to the standard NVD URL.
- Feed data is validated when it's loaded: malformed releases are skipped instead of crashing the list, control characters are stripped from text, and values placed in URLs are encoded.
- Downloads only come from Apple over https, including every redirect. Installer packages must carry Apple's signature, and are deleted if they don't.
- Data is cached so the list opens instantly, and data cached by older versions of the extension is discarded automatically.
