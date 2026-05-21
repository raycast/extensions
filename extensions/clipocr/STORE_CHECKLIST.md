# Raycast Store Checklist

Use this checklist before publishing or opening a pull request to `raycast/extensions`.

## Metadata

- `package.json` has a unique URL-safe `name`.
- `package.json` has a clear `title` and `description`.
- `author` is your Raycast Store username.
- `license` is `MIT`.
- `platforms` is set to `["Windows"]` because the screenshot flow uses Windows Screen Snip.
- `categories` contains at least one valid Title Case category.
- `keywords` describe common search terms.
- `package-lock.json` is committed.

## Assets

- `assets/command-icon.png` is a non-default 512x512 PNG.
- No unused bundled assets are committed.

## Documentation

- `README.md` explains setup, usage, preferences, and troubleshooting in English.
- `README.zh-TW.md` provides Traditional Chinese documentation for local users.
- `CHANGELOG.md` includes user-facing changes.
- External setup requirements are documented: Tesseract, language data, and `tessdata_best` vs `tessdata_fast`.

## Validation

Run:

```powershell
npm install
npm test
npm run lint
npm run build
```

Then test locally:

```powershell
npm run dev
```

## Publish

Run:

```powershell
npm run publish
```

Raycast's publish command validates the extension and opens a pull request in the `raycast/extensions` repository.
