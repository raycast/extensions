# Jev Changelog

## [Initial Version] - {PR_MERGE_DATE}

- New `Ask Jev` command: type a plain-English request into Raycast root search, press Enter on the fallback row, and Jev resolves it into a concrete action — opening a download (newest, nth, or first-ever, optionally by file type), launching an installed app, finding a file in Downloads/Desktop/Documents, or opening a site.
- Powered by TypeSafe's System One model over closed-set `Choice` questions — Jev only ever selects from real candidates (installed apps, files actually on disk, a curated site table); deterministic code resolves the final target.
- Privacy-scoped interpretation: the classifier sees only the query + installed app names; file names are sent to the API only when the request is actually about opening a file, and download queries send no candidate list at all.
- Local file inventory and app list are cached per session instead of rescanning on every keystroke.
