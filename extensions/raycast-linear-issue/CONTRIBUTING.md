# Contributing to Linear Issue AI

Thanks for your interest in improving this Raycast extension! Contributions of all kinds are welcome—bug reports, feature ideas, docs updates, or code changes.

## Getting Started

1. Fork the repository and create a feature branch (`git checkout -b feature/your-feature`).
2. Install dependencies with `npm install`.
3. Run the extension locally via `ray develop`.

## Development Checklist

- Keep the TypeScript strict mode warnings at zero.
- Run `npm run lint` before pushing. This executes Raycast's ESLint and Prettier checks.
- Prefer English for code comments and UI strings.
- Include screenshots/gifs when proposing UX/UI changes.

## Reporting Issues

When opening an issue, please include:

- Raycast version and macOS version.
- Steps to reproduce (screenshots or screen recordings are helpful).
- Expected vs actual behavior.

## Pull Requests

- Keep PRs focused; avoid combining unrelated changes.
- Describe the motivation, approach, and testing in the PR description.
- Link any related issues.
- After opening a PR, ensure CI (lint/build) is green.

## Code of Conduct

Be respectful and constructive. By participating you agree to follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). If inappropriate behavior occurs, please contact the maintainers.
# Contributing Guide

Thanks for taking the time to improve **Linear Issue AI**! This document explains how to set up your environment, propose changes, and ship a release-quality Raycast extension.

## Development Setup

1. Fork the repository and clone your fork.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start a local Raycast dev session:
   ```bash
   npm run dev
   ```
   Raycast will reload automatically whenever you save a file.

## Coding Standards

- TypeScript with `strict` mode is required.
- Prefer descriptive naming and English copy for all user-facing text.
- Avoid `any`. If external APIs return loose structures, create dedicated types.
- Keep functions small and add short comments when logic is non-obvious.

## Testing Checklist

Before opening a pull request, run:

```bash
npm run lint
npm run build
```

If you touch the prompt or Linear mapping logic, also verify the command manually via `ray develop`.

## Pull Requests

- Keep PRs focused; large changes should be split into logical commits.
- Update `README.md` and `CHANGELOG.md` when you add or change user-facing behavior.
- Mention any screenshots or recordings that help reviewers understand the change.
- Use the pull request template to capture testing details and context.

## Release Workflow

1. Update `CHANGELOG.md` with a new version section and summarize changes.
2. Bump the version in `package.json`.
3. Run `npm run lint` and `npm run build`.
4. Create a git tag (`vX.Y.Z`) and publish the release notes.
5. Submit/Update the extension listing in the Raycast Store if needed.

## Questions?

Open a discussion or start a draft PR if you need feedback before implementing a full solution. Thank you for helping build a better Linear workflow!

