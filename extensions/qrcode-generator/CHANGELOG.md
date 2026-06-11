# QR Code Generator Changelog

## [Custom colors, distinct icons, link shortening & UTM] - 2026-06-07

- Fixed error toasts showing "[object Object]" instead of the actual error message (#27569)
- Added a distinct, color-coded icon per command for easier recognition in Raycast
- Added QR color customization: presets or custom hex, color-chip previews, a default-color preference, and a low-contrast warning
- Added an opt-in link shortener (is.gd, da.gd, then TinyURL) to keep long-URL QR codes scannable
- Added optional UTM tracking parameters

## [Improve UX] - 2025-12-27

- Persist the selected format in the dropdown
- Allow users to return to QR editing in inline mode

## [Maintenance] - 2025-12-12

- Add support for Windows platform.
- Bump all dependencies to the latest.

## [Enhancement] - 2025-10-03

- Added a new action to copy QR code to clipboard

## [Better Visibility in Raycast UI] - 2025-08-25

- Added [Generate QR Code from Selection] Command

## [Better Visibility in Raycast UI] - 2025-06-18

- Added internal argument to generate QR codes with a white background for visibility

## [Improved User Experience] - 2025-06-18

- Added success toast notification when generating QR code from clipboard
- Adjusted clipboard-generated QR code height to 355px to prevent overflow and scrolling in Raycast window
- Refactored QRCodeView component with configurable height parameter

## [Added SVG Support] - 2025-05-14

- Added support for generating QR codes in SVG format
- Added option to save QR codes as vector-based SVG files
- Updated documentation to reflect new SVG capabilities
- Added new contributor

## [Initial Version] - 2023-10-19

- Initial version of QR Code Generator
- Support for generating QR codes in PNG format
- Ability to generate QR codes from clipboard content
- Option to save QR codes to disk or view them inline
