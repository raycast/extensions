# Pianoman Changelog

## [Fix] - 2026-07-03

- Fix: Resolve recurring "Incompatible React versions: react and react-dom must have the exact same version" crash by removing `react-dom`. Chord keyboard SVGs are now built as plain strings (no server-side render library), so string rendering no longer depends on the host React version.

## [Fix] - 2025-04-16

- Fix: Cannot read properties of undefined (Update dependencies to the latest version)

## [Initial Version] - 2022-10-05

- Command: Search for piano chords
