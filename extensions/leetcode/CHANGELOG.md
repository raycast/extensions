# LeetCode Changelog

## [Search Pagination and Fixes] - 2026-11-11

- Load more search results as you scroll instead of stopping at the first 30, and reload from the first page if loading a page fails
- Search by keyword with the query behind LeetCode's own problemset search, so results stay in relevance order across pages without repeats or gaps, and each page loads several times faster
- Fix problem search showing no results while the search bar is empty (LeetCode now returns nothing for an empty keyword)
- Fix problem search showing stale results: clearing the search text or switching the category now refreshes the list, and reopening the command revalidates instead of showing the last search
- Add `Open in Browser` and `Copy Link to Clipboard` actions to search results
- Fetch problem lists without code templates, making search and random-pick responses about 90% smaller
- Fix `Pick a Random Problem` showing `No matches` with the `All` category, and ignoring a saved `Exclude premium` checkbox until it was toggled. Filters saved before this update are reset once, so pick your difficulty, category, topic tags, and premium choice again
- Show the picked problem's description in `Pick a Random Problem`; `Pick Another` is now the primary action
- Make random picks uniform over every matching problem, including with premium excluded; the last problems matching the filters were picked less often or never, and when every problem matching the filters is premium, say so instead of re-rolling
- Fix the default language preference: add `Python3` as the new default (`Python` is LeetCode's Python 2), fix `Go` never matching LeetCode's `golang` templates, and add Rust, PHP, Dart, Scala, Elixir, Erlang, and Racket
- Show plain language names in the `Copy Code Template` submenu (`Go` instead of `Go Code`)
- Add `Show Topic Tags` preference to show a problem's topic tags in previews and random picks (off by default, since tags can hint at the solution)
- Stop repeating the paid-only failure toast whenever a premium problem preview re-renders; the notice stays in the preview
- Hide the browser, link, and copy actions on the daily challenge until the problem has loaded
- Stop marking every problem `Unrated` when the zerotrac ratings fail to load

## [Fix Menu Bar Icon Color] - 2026-09-19

- Fix the daily challenge menu bar icon showing the wrong color after recent Raycast updates by tinting a single icon instead of using light and dark variants

## [New Additions] - 2026-07-14

- Add `User Profile` command
  - Show solve stats, streak, global ranking, and contest rating for a username
  - Browse recent accepted submissions in a sub-view, each with its difficulty tag and submission time, reusing the problem preview
- Add `Random Problem` command
  - Pick a random problem filtered by difficulty, category, topic tags, and premium (paid-only) status
  - Re-roll with `Pick Another`, preview the full problem, or open it in the browser
- Add `Daily Challenge Status` menu bar command
  - Show whether today's daily challenge is solved and the time left until the UTC reset
  - Use a flame icon (outline when unsolved, filled when solved); solved detection is cookie-less via recent accepted submissions
- Add shared `LeetCode Username` preference, used by the menu bar and as the default for the `User Profile` command
- Add `Show Problem Ratings` preference to display community difficulty ratings from [zerotrac](https://github.com/zerotrac/leetcode_problem_rating)
  - Show color-coded ratings across problem search, recent submissions, the random picker, and problem previews, with an `Unrated` marker when a problem has no rating
- Apply the `Show Problem Stats` preference to the full problem preview so hidden stats stay hidden there too
- Upgrade the extension to the React 19 / `@raycast/api` 1.104 toolchain

## [Show Problem Stats Preference] - 2026-06-01

- Add `Show Problem Stats` preference to toggle difficulty, likes, dislikes, and acceptance rate visibility in both the daily challenge and problem search views

## [Fixes] - 2025-03-20

- Unescape square brackets in markdown conversion to avoid matching Latex delimiters (see [this](https://leetcode.com/problems/minimum-cost-walk-in-weighted-graph/description/) LeetCode problem to see what goes wrong if we do not unescape square brackets)

## [Code Template Features] - 2025-01-23

- Add Copy Code Template submenu action to copy problem's code template to clipboard
- Add preference setting for default programming language
- Show star (⭐) indicator for preferred language in template list
- Sort code templates to show preferred language first

## [Features] - 2024-10-26

- Add `Copy Problem to Clipboard` action to copy the problem as markdown to the clipboard.

## [Fixes] - 2024-10-07

- Ensure proper newline handling for `<pre>` tags in problem details Markdown code blocks.

## [More Problem Categories] - 2024-09-22

- Categories now have icons
- Add 2 problem categories:
  1. JavaScript
  2. pandas
- Show Loading (previously, no loading was shown while searching problems)
- Allow Paid Problems Preview w/o content (now you can view stats of a paid problem - the content/markdown is still not
  shown)
- modify components to prefer `useFetch` props over `useState` and `useEffect`

## [Initial Version] - 2023-01-25

- Add the `Daily Challenge` command.
- Add the `Search Problem` command.
