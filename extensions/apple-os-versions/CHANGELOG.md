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

### Preferences

- Primary Action chooses what Enter does: Copy Version, Copy Build, Show CVEs, Search CVE, Open Apple Security Notes, or Open in SOFA.
- Refresh Data chooses how often SOFA data is downloaded: every time the command opens, or only when the saved data is older than 1, 4, or 12 hours, or a day. Refresh (⌘R) always updates immediately.

### Security

- Links from the feed are only opened when they are `https` on the host the UI names (`support.apple.com`, `nvd.nist.gov`). Other NIST links fall back to the standard NVD URL.
- Feed data is validated when it's loaded: malformed releases are skipped instead of crashing the list, control characters are stripped from text, and values placed in URLs are encoded.
- Data is cached so the list opens instantly, and data cached by older versions of the extension is discarded automatically.
