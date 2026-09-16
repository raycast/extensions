# ADR-0009: Release Versioning and Changelog with git-cliff

- Status: Accepted
- Date: 2026-09-15

## Context

The Raycast Store has no extension versions: the manifest schema defines no
`version` field, and `npm run publish` squashes commits into a pull request to
`raycast/extensions`. Its changelog enforcer only checks that `CHANGELOG.md`
changed, but reviewers and the Store expect entries shaped as
`## [Title] - {PR_MERGE_DATE}`, newest first. This repository already uses
Conventional Commits.

## Decision

- **Versions are git tags** (`v1.2.3`) in this repository only. The manifest
  gets no `version` field.
- **git-cliff** (`cliff.toml`) renders unreleased `feat`, `fix`, and `perf`
  commits as Raycast entries; everything else is skipped. Breaking commits get a
  `Breaking:` prefix and bump the major version; features bump the minor
  version.
- **`npm run release`** (`scripts/release.mts`):
  1. refuses to run with uncommitted changes;
  2. with no tags yet, tags `v1.0.0` for the existing `[Initial Version]` entry;
  3. otherwise computes the next version, inserts the entry directly below the
     `# Ebook Hub Changelog` title, commits `chore(release): vX.Y.Z`, and tags it;
  4. fails when there are no user-facing changes.
- `--dry-run` previews the entry; `--title "Readable Title"` replaces the version
  in the heading. `npm run changelog:preview` shows the raw git-cliff output.
- The script is tested (including an end-to-end run with real git and
  git-cliff) and counts toward the 95% coverage gate (ADR-0008).

## Consequences

- Commit subjects become user-facing text, so `feat`, `fix`, and `perf`
  subjects must read well for readers.
- Entries can still be edited by hand before `npm run publish`; the tag marks
  the release commit.
- Tags are local until pushed (`git push --follow-tags`) once the repository has
  a remote.

## Alternatives Considered

- **changesets** — hardcodes `## <version>` headings and a `# <package>` title;
  needs post-processing for Raycast. Rejected.
- **release-please** — heading format not configurable and requires a GitHub
  remote. Rejected.
- **semantic-release / release-it / commit-and-tag-version** — built around npm
  or GitHub publishing and a `package.json` version. Rejected as heavier than
  needed.
- **git-cliff `--prepend`** — prepends above the changelog title; the release
  script inserts below it instead.
