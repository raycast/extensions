# Next Best Time to Post Changelog

## [Initial Release] - {PR_MERGE_DATE}

- One row per social platform, sorted by which platform's next peak is soonest.
- Eight platforms supported: Facebook, Instagram, LinkedIn, TikTok, YouTube
  Shorts, YouTube (Long-form), X (Twitter), and Threads.
- "Show heatmap" detail view per platform — a `<pre>`-based Unicode sparkline
  showing the full week with peaks highlighted.
- "Post on \<Platform\>" action that opens the platform's web composer
  (`⌘ + P`); each URL is configurable in the extension preferences.
- "View Buffer Source" action linking to the platform's section on Buffer's
  source page (`⌘ + ⇧ + S`).
- In-app "Manage Platforms" view (`⌘ + ⇧ + P`) for choosing which platforms
  appear and in what order. State persists across launches via LocalStorage.
- Preferences for 12-hour vs 24-hour time format, light-mode icon style,
  dark-mode icon style, and per-platform post URL overrides.
- Light and dark mode icons.
