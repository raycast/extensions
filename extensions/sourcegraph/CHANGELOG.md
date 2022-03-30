# Changelog

## [Feb 15th, 2022](https://github.com/raycast/extensions/pull/919)

- **search**: Fix URLs opened by `symbol` match results. ([#7](https://github.com/bobheadxi/raycast-sourcegraph/pull/7))

## [Feb 7th, 2022](https://github.com/raycast/extensions/pull/833)

- **search**: Fix off-by-one issue when opening `content` match results.
- **search**: Migrate away from the [deprecated `/search/stream` endpoint](https://about.sourcegraph.com/blog/release/3.36/) in favour of `/.api/search/stream`.

## [Jan 22nd, 2022](https://github.com/raycast/extensions/pull/729)

- **all**: Configuration for "Sourcegraph Instance" commands has been moved from the top-level "Search Code" command into the Sourcegraph extension preferences, and has been renamed "Sourcegraph Self-Hosted" for clarity. As a result of this, existing preferences might be reset and need reconfiguring. ([#2](https://github.com/bobheadxi/raycast-sourcegraph/pull/2))
- **notebooks**: "Find Search Notebooks" is a new command that allows you to query, peek, open, and create [Sourcegraph Search Notebooks](https://sourcegraph.com/notebooks?tab=explore)! ([#2](https://github.com/bobheadxi/raycast-sourcegraph/pull/2))
- **search**: For `content` and `symbol` matches, if there is more than 1 result in the match, the default command when pressing `Enter` is now a revamped peek view that allows you to filter and jump to specific results. ([#4](https://github.com/bobheadxi/raycast-sourcegraph/pull/4))
- **search**: The shortcut to open the entire query in browser is now `Cmd`-`Shift`-`O`. ([#3](https://github.com/bobheadxi/raycast-sourcegraph/pull/3))
- **all**: Sourcegraph Self-Hosted variants of each command now have an alternative icon to help better differentiate them.

## [Jan 20th, 2022](https://github.com/raycast/extensions/pull/708)

- Initial release on the [Raycast store](https://www.raycast.com/bobheadxi/sourcegraph)
