# sir.golf Changelog

## [Initial Version] - 2026-07-24

- **Leaderboard** command — one view that switches between the **live tournament** (graceful fallback to the most recent completed event when nothing's live; auto-refreshes every 30s during play) and **season rankings**: scoring average, FedEx Cup, money, wins, driving, GIR, birdies, top-10s, cuts. Each player has a side-pane detail with headshot, bio and season stats. A live or recent **major** is flagged (⛳) in the title.
- **Golf Season** command — the tour schedule: this week, upcoming, and **any past season (2001+) with winners**, plus per-tournament details (course, location, purse, signature/major flag, defending champion, forecast, ESPN link).
  - **Every major badged** — the four men's majors and five women's majors are detected and marked with a star and a "Major Championship" tag.
  - **Add to Calendar** (⌘⇧A) — one tap writes a branded `.ics` (event details + where-to-watch guide) to your calendar. Fully local, no account.
  - **Filter by tour or by where it streams** — one dropdown filters the schedule by tour or by region, including 🇦🇹 Austria and 🇩🇪 Germany (Sky, ServusTV, ORF).
  - Compact date ranges on every row (e.g. _Jul 16–19_).
- Side-pane details everywhere (no nested pages); tour switcher (⌘T) across PGA / LPGA / DP World; default-tour preference.
- First-class **loading**, **error**, **off-season/empty** and **pre-tournament** states.
- $0 and no AI: keyless, backend-less fetch from ESPN's public golf API, cached locally.
