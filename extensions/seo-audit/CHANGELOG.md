# SEO Audit Changelog

## [Initial release] - {PR_MERGE_DATE}

Three commands over the same engine the `seo-audit` command line, GitHub Action
and macOS app use — imported, not reimplemented, so a report from a launcher and
one from `seo-audit --json` are the same report.

- **Preview a Site** — how big is this, and is it the right one. Three requests
  and about a second: how many URLs the sitemap lists, how many would be
  checked, and where the weight of the site is. A full crawl takes minutes and a
  launcher is built for the second you spend in it, so this is the command the
  extension exists for.
- **Audit a Site** — crawls and lists what to change, worst first and grouped,
  so 171 findings read as 55 things to fix. Capped by preference, and it counts
  against that ceiling while it runs.
- **Recent Reports** — runs the macOS app has kept, read from the same folder it
  writes, so a crawl finished in the window is here a second later.

Every flag that shapes a run is a preference: page limit, crawl speed, outbound
links, sitemap override, URL exclusions, only-what-changed-since, the browser
and system to identify as, PageSpeed, and the list of checks to silence.

`⌘E` exports HTML, Markdown, CSV, JSON or a corrected sitemap through the
engine's own writers.

Nothing leaves the machine. There is no account, no upload and no server.
