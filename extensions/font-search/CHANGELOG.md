# Search Installed Fonts Changelog

## [Fix Font Preview in Dark Mode] - {PR_MERGE_DATE}

- The font preview was rendered with black text regardless of the theme, making it invisible in dark mode. It is now tinted with Raycast's primary text color, so it follows the active theme, including custom ones.
- Fixed the preview failing to render when the preview text or a font name contains `&`, `<` or `>`, which produced invalid SVG markup.

## [Updates] - 2025-05-08

- Added a sub menu for each font's postscript names. Opened with Cmd + N.

## [Initial Version] - 2024-10-09
