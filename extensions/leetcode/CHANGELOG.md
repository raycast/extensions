# LeetCode Changelog

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
