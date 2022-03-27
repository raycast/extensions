# Changelog

## [Batch changes, revamped previews, and refined behaviour] - Unreleased

- **search**: Some search result types now leverage metadata details.
- **notebooks**: Notebook view now leverage metadata details and support the new Symbol block type.
- **search**, **notebooks**: The default action on results is now to always open a preview in Raycast, rather than opening in browser directly, for consistency.
- **batch-changes**: "Manage Batch Changes" is a new command that allows you to browse, view, publish, merge, and retry changesets for [Sourcegraph Batch Changes](https://about.sourcegraph.com/batch-changes)! This is only supported on Sourcegraph Self-Hosted. ([#11](https://github.com/bobheadxi/raycast-sourcegraph/pull/11), [#13](https://github.com/bobheadxi/raycast-sourcegraph/pull/13))
- **prefs**: Fixed issue with self-hosted instance URLs that have trailing slashes. ([#12](https://github.com/bobheadxi/raycast-sourcegraph/pull/12))
- **search**: The default context is now explicitly pre-populated in the search bar, instead of being implicit.

## [Bug fixes](https://github.com/raycast/extensions/pull/919) - 2022-02-15

- **search**: Fix URLs opened by `symbol` match results. ([#7](https://github.com/bobheadxi/raycast-sourcegraph/pull/7))

## [Bug fixes and internal updates](https://github.com/raycast/extensions/pull/833) - 2022-02-07

- **search**: Fix off-by-one issue when opening `content` match results.
- **search**: Migrate away from the [deprecated `/search/stream` endpoint](https://about.sourcegraph.com/blog/release/3.36/) in favour of `/.api/search/stream`.

## [Revamped configuration, search notebooks, and revamped results peek](https://github.com/raycast/extensions/pull/729) - 2022-01-22

- **prefs**: Configuration for "Sourcegraph Instance" commands has been moved from the top-level "Search Code" command into the Sourcegraph extension preferences, and has been renamed "Sourcegraph Self-Hosted" for clarity. As a result of this, existing preferences might be reset and need reconfiguring. ([#2](https://github.com/bobheadxi/raycast-sourcegraph/pull/2))
- **notebooks**: "Find Search Notebooks" is a new command that allows you to query, peek, open, and create [Sourcegraph Search Notebooks](https://docs.sourcegraph.com/notebooks)! ([#2](https://github.com/bobheadxi/raycast-sourcegraph/pull/2))
- **search**: For `content` and `symbol` matches, if there is more than 1 result in the match, the default command when pressing `Enter` is now a revamped peek view that allows you to filter and jump to specific results. ([#4](https://github.com/bobheadxi/raycast-sourcegraph/pull/4))
- **search**: The shortcut to open the entire query in browser is now `Cmd`-`Shift`-`O`. ([#3](https://github.com/bobheadxi/raycast-sourcegraph/pull/3))
- **all**: Sourcegraph Self-Hosted variants of each command now have an alternative icon to help better differentiate them.

## [Initial release](https://github.com/raycast/extensions/pull/708) - 2022-01-20

- Initial release on the [Raycast store](https://www.raycast.com/bobheadxi/sourcegraph)
