# LeetCode Changelog

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
