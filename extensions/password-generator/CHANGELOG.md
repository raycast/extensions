# Password Generator Changelog

## [Windows Support & Dependency Updates] - {PR_MERGE_DATE}

- Added support for Raycast on Windows.
- Updated dependencies to their latest versions:
  - `@raycast/api`
  - `@raycast/eslint-config`
  - `@types/react`
  - `prettier`
  - `react`
  - `typescript`

## [Guarantee presence of special characters] - 2025-08-20

If "Use numbers?" and/or "Use special characters?" are selected, the password is guaranteed to have at least one of each of those characters.

## [Generate memorable passwords] - 2024-09-23

There's now a command called "Generate Memorable Password". It will create an easier-to-type-and-remember password and can be fully customized.

## [Update] - 2024-09-05

Updated dependencies
Updated screenshots

## [Enhancements] - 2024-06-06

Add preference to store last used password length

## [Enhancements] - 2024-06-05

Add preference to hide Raycast window after copying password with HUD information.
​

## [Security Fixes] - 2023-10-30

Fixed generator to use a cryptographically secure random number generator.
