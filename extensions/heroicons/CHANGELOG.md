# Heroicons Changelog

## [v.1.2.3] - 2025-04-12

- Fixed 404 error by replacing the repo where we get the name from


## [v.1.2.2] - 2024-04-09

- Fixed an issue with search crashing due to a list not being able to load (url changed)
- Updated dependencies
- Replace Got with `node-fetch`

## [v.1.2.1] - 2023-10-31

- Removed tags as some change on Tailwind's website made the tag file no longer available. This change is a hot-fix to make the extension work again, hopefully, if needed, the developer responsible for it will make a proper fix.

## [v.1.2.0] - 2023-08-15

- Added a few new actions: paste or copy import declarations for React/Vue libraries. Heroicons supports two npm packages that simplify using icons in React/Vue components. However, it can be really annoying to write an import declaration for icons (you need to copy an icon name, then transform it to UpperCamelCase + Icon suffix, and then the path may be different in your project).

These new actions help you to copy or paste an import declaration for the selected icon. The import template can be customized in the extension preferences (by default, it matches the example from the Heroicons README).

## [v1.1.0] - 2022-08-31

- Added option to customize primary and secondary action (feature request by @teziovsky #2736)
- Fixed useEffect dependency array

## [v1.0.0] - 2022-08-31

- Improved search
- Fixed missing icons
- Fixed bad visibilty of icons in dark mode
- Moved logo to the correct path

## [Initial Version] - 2022-08-25

Initial version code

- Add Icons
- Add Filter option
- Add Heroicons Extension
