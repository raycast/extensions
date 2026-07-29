# 1.0.0 (2026-07-29)


### Features

* first commit ([532e7b7](https://github.com/amine2233/raycast-dev-project-launcher/commit/532e7b7ddc485a58abe2c7eb2dd1d5f1f0021bf1))

# Dev Project Launcher Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Recursive project scanner for `~/Development` plus user-defined custom
  directories, with configurable scan depth and folder exclusions.
- Marker-file based project-type detection (Xcode, Swift Package,
  Kotlin/Gradle, Android/Gradle, Node, TypeScript, Python, Rust, Go,
  Java/Maven, Flutter, Ruby, generic Git repo).
- `Browse Development Projects` List command with per-type icons, git
  badges, and last-modified accessories, grouped by source root.
- Multi-action panel: Open in VS Code, Open in WebStorm, Open in iTerm,
  Reveal in Finder, Copy Path, Open With…, Rescan Projects.
- `Manage App Paths` command backed by `LocalStorage` for fully dynamic,
  persistent per-project-type editor path mapping — including user-defined
  project types beyond the builtin set.
