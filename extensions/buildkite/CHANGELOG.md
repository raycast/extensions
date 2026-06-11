# Buildkite Changelog

## [Build Graph & Unblock Steps] - 2026-05-22

- Added a "Show Build Graph" action on each build that renders the build's steps grouped by dependency stage, with state icons and step dependencies.
- Added an "Unblock Step" action for blocked manual steps so pipelines can be unblocked without leaving Raycast.
- Added an "Unblock All Steps" action (⌘⇧U) that iterates and unblocks every blocked step in the build.
- Added a ⌘⇧G keyboard shortcut to "Show Build Graph".

## [Fix potentially undefined data] - 2023-12-12

- Fixes GraphQL data that is potentially undefined
- Refactors GraphQL queries to use codegen

## [Fixes and Updates] - 2022-03-25

- Added extension metadata
- Updated to the new Raycast API

## [Initial Version] - 2021-10-22

Add Buildkite Extension.
