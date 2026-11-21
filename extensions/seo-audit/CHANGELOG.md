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
- **Search Console**, optional — how many times Google actually showed each
  page, which is the only number in this extension that is not a proxy for
  attention. Credentials are a terminal errand (`seo-audit
  --search-console-login`, once); without them the report says which ones are
  missing rather than going quiet.
- **Audit a Site** — crawls and lists what to change, worst first and grouped,
  so 171 findings read as 55 things to fix. Capped by preference, and it counts
  against that ceiling while it runs.
- **The rest of the domain** — what *else* is on this domain, and whether any of
  it is damaging the site that was audited: a staging copy left open to the
  index, a subdomain whose CNAME points at a service that is gone and which
  anybody could claim, a second host serving the same site. Hostnames come from
  certificate transparency and are then resolved and fetched, because the logs
  are a complete list of names and a terrible list of live ones — nothing from
  them is reported unverified. The inventory is shown whether or not anything
  was wrong with it.
- **Recent Reports** — runs the macOS app has kept, read from the same folder it
  writes, so a crawl finished in the window is here a second later.

A check that did not run says whether anybody can do anything about it. "No page
declares hreflang" is a fact about the site; "Outbound links were not checked" is
a run that was not asked to — and that row can be pressed to run again with the
flag on.

Every flag that shapes a run is a preference: page limit, crawl speed, outbound
links, the rest of the domain, sitemap override, URL exclusions,
only-what-changed-since, the browser and system to identify as, PageSpeed, and
the list of checks to silence. The page limit is capped at 40: a Raycast command
gets a 100MB heap and a crawl holds every page until the cross-page checks are
done, so a bigger number would be killed mid-run rather than reported. Big sites
belong in the macOS app or the terminal, which have the whole machine behind
them.

`⌘E` exports HTML, Markdown, CSV, JSON or a corrected sitemap through the
engine's own writers.

Nothing leaves the machine. There is no account, no upload and no server.
