# Pianoman Changelog

## [Fix] - {PR_MERGE_DATE}

- Fix: Resolve recurring "Incompatible React versions: react and react-dom must have the exact same version" crash by removing `react-dom`. Chord keyboard SVGs are now rendered with Preact (`preact-render-to-string`) in an isolated module, so string rendering no longer depends on the host React version.

## [Fix] - 2025-04-16

- Fix: Cannot read properties of undefined (Update dependencies to the latest version)

## [Initial Version] - 2022-10-05

- Command: Search for piano chords
