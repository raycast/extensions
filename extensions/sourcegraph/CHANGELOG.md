# Changelog

## [Sourcegraph.com update, fix for match repository text](https://github.com/raycast/extensions/pull/2165) - 2022-07-04

- **all**: [The future of Sourcegraph is single-tenant](https://about.sourcegraph.com/blog/single-tenant-cloud) - this means that support for private code on Sourcegraph.com will soon be going away. This means that soon, the default "Search code" command - which searches Sourcegraph.com - will only be able to search the 2.2m+ open source repositories available on Sourcegraph.com. To search your private code, please reach out to [get a demo of the single-tenant solution](https://about.sourcegraph.com/demo), or [try out a self-hosted installation of Sourcegraph](https://about.sourcegraph.com/get-started/self-hosted). Various documentation updates, renames, and internal changes have been made to reflect this upcoming change.
- **search**: Fix issue where matches for which the associated repository is not tied to a specific revision associated would mistakenly have `@` appended.
- **internal**: Dependency updates.

## [Improved revision search and result tooltips](https://github.com/raycast/extensions/pull/2108) - 2022-06-27

- **search**: Results from revision matches (e.g. with `repo:sourcegraph@3.41`) now annotate results with which revision the match was on, and drilldowns (<kbd>Tab</kbd> on a result) now more consistently apply the appropriate revision to generated searches.
- **search**: Repository results with long names and long descriptions that are at risk of getting their names cut off are now hoverable for the full name of the repository.
- **search**: Repository results with short descriptions no longer have hover text.

## [Search performance improvements](https://github.com/raycast/extensions/pull/1844) - 2022-05-29

- **search**: The drilldown action shortcut is now <kbd>Tab</kbd>, to align the shortcut for selecting suggestions in the Sourcegraph web application. For example, on a repository result, <kbd>Tab</kbd> will start a search with the `repo:` filter.
- **search**: The number of rendered results is now limited, which drastically improves performance and stability.
- **search**: Progress text now indicates whether there are more results to be found and when rendered results are a subset of all results.
- **search**: Empty search text states now load faster.
- **self-hosted**: Setup prompts now include an action to directly open extension preferences.
- **internal**: Migrate to `graphql-code-generator` ([#16](https://github.com/bobheadxi/raycast-sourcegraph/pull/16))

## [Fix search suggestions](https://github.com/raycast/extensions/pull/1696) - 2022-05-14

- **search**: Fix 'Apply suggestions' on some suggestions returned by the search API. ([#15](https://github.com/bobheadxi/raycast-sourcegraph/pull/15))

## [Search fixes, hover tooltips](https://github.com/raycast/extensions/pull/1493) - 2022-04-25

- **search**: Internal improvements to mitigate stuttering when typing search queries.
- **search**: Icons, titles, and subtitles in the main search results list are now all hoverable to see more details.
- **batch-changes**: Some list elements are now hoverable for additional details.
- **notebooks**: Some list elements are now hoverable for additional details.

## [Bug fixes](https://github.com/raycast/extensions/pull/1291) - 2022-04-05

- **batch-changes**: Fix an issue where typing quickly could cause missed characters.

## [Batch Changes, revamped previews, and refined behaviour](https://github.com/raycast/extensions/pull/1228) - 2022-04-03

- **batch-changes**: "Manage Batch Changes" is a new command that allows you to browse, view, publish, merge, and retry changesets for [Sourcegraph Batch Changes](https://about.sourcegraph.com/batch-changes)! This is only supported on Sourcegraph Self-Hosted. ([#11](https://github.com/bobheadxi/raycast-sourcegraph/pull/11), [#13](https://github.com/bobheadxi/raycast-sourcegraph/pull/13))
- **search**, **notebooks**: The default action on results is now to always open a preview in Raycast, rather than opening in browser directly, for consistency. Previously, results with single matches would open in the browser directly.
- **search**: Search results now have a new drilldown action to query within the result's repository or file using the `Cmd-S` shortcut. For example, on a repository result, `Cmd-S` will start a search with the `repo:` filter.
- **search**: The default context is now explicitly pre-populated in the search bar, instead of being implicit.
- **search**: You can now apply suggestions directly with an action.
- **search**: Path result previews (e.g. from `type:path` or `select:file`) now render a preview of the file contents.
- **search**: Repo result previews (e.g. from `repo:` or `type:repo`) now render the repository's `README.md`.
- **search**: Some search result types now leverage metadata details.
- **search**: An experimental dropdown for selecting the search pattern type to use can now be enabled under the extension preferences.
- **search**: Potential fix for issue with connecting to self-hosted Sourcegraph instances. ([raycast/extensions#1126](https://github.com/raycast/extensions/issues/1126))
- **notebooks**: Notebook view now leverage metadata details and support the new Symbol block type.
- **prefs**: Fixed issue with self-hosted instance URLs that have trailing slashes. ([#12](https://github.com/bobheadxi/raycast-sourcegraph/pull/12))

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
