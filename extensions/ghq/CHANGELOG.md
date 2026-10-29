# ghq Changelog

## [Get Repository] - 2026-10-29

- Add repository cloning with SSH, shallow clone, and update options.
- Use the configured ghq root and allow a custom ghq executable path.
- Show progress and errors, with repository search available after completion.
- Update dependencies and ESLint configuration.

## [Updated Git Project Detection] - 2026-02-24

- Changed logic to match `ghq list`:
  - Find git project folders by checking for `.git` directory
  - No longer recurses once inside a git project folder

## [Initial Version] - 2024-02-13
