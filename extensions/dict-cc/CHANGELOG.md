# dict.cc Changelog

## [v.1.4.1] - 2026-10-13

- Fixed "Translate from Clipboard"/"Translate from Selection" prefill that kept re-running on every search edit, resurrecting the copied term after clearing the search bar with Esc.
- Superseded translation requests are now invalidated, so stale replies can no longer fill results under an empty or already-changed search text.

## [v.1.4.0] - 2025-12-07

- Added support for Windows

## [v.1.3.0] - 2025-04-09

- Introducing `Translate from Selection` command.

## [v.1.2.0] - 2023-02-27

- Introducing `Translate from Clipboard` command.

## [v1.1.0] - 2023-02-14

- Added an action that allows to play the translation pronunciation audio

## [v1.0.0] - 2022-04-10

- Initial release with translate command
