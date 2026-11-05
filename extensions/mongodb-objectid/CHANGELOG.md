# MongoDB ObjectId Changelog

## [Fix crash on launch] - 2026-10-31

- Use `bson` directly instead of the full `mongodb` driver, which pulled in the `punycode` package that crashed the extension on launch

## [Added MongoDB ObjectId Extension] - 2025-01-02

- Init release
