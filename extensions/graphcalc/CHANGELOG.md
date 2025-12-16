# GraphCalc Changelog

## [SVG Rendering Rewrite and Dependency Cleanup] - 2025-12-12

- Replaced recharts library with custom pure SVG rendering for better compatibility
- Fixed LaTeX rendering issues (now using proper `$$expression$$` syntax)
- Removed unused dependencies (recharts, chart.js, react-dom)
- Improved graph rendering reliability with static SVG generation
- Better theme support with proper color adaptation for light/dark modes
- More accurate graph scaling and axis labels
- Fixes https://github.com/raycast/extensions/issues/23451

## [🔍Zoom, 🧭panning navigation and 🐛bugfixes] - 2024-11-30

- Along with the ability to zoom and pan, the graph now has a reset button
- Color toggle for the graph
- Fix rendering for infinite values so -Infinity and Infinity are not connected by a line
- Use MathMl in the formula representation
- Refactoring and cleanup

## [Fixing colors] - 2024-11-09

- Color fixes for graph, darkmode was not easy to read

## [Bug Fixes and Improvements🐛] - 2024-05-28

- Fixing empty state flicker issue
- Removing History from the graph view
- Fixing control state on List

## [Initial Version] - 2024-05-17

- Add logic to handle both expressions and equations
- Add a history panel to view previous actions
