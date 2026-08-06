# Store Submission Checklist

Use this checklist before opening the Raycast Store publish PR.

## Updating a Published Extension

1. Merge the completed feature branch into `main`.
2. If Raycast reviewers or contributors changed the Store copy, sync those changes before publishing:

   ```bash
   npx @raycast/api@latest pull-contributions
   ```

3. Resolve and commit any sync changes.
4. Add a user-facing `CHANGELOG.md` entry using this format:

   ```markdown
   ## [Descriptive Update Title] - {PR_MERGE_DATE}
   ```

5. Complete the validation and manual QA below.
6. Run `npm run publish`. Run it again after further changes to update the open Raycast pull request.

## Validation

Local development uses Bun:

```bash
bun install --frozen-lockfile
bun run lint
bun run build
```

Raycast Store CI uses npm, so validate the npm path before publishing:

```bash
npm ci
npm run lint
npm run build
```

Publish when the extension is ready:

```bash
npm run publish
```

`npm audit` currently reports a low-severity `esbuild` advisory through `@raycast/api`. Do not run `npm audit fix --force` unless Raycast recommends it, because npm resolves that by downgrading `@raycast/api`.

## Manual QA

Run the built extension in Raycast and verify the user-facing flows:

- Empty state shows `Get Started` and `What's New`.
- Company name search, for example `nokia`, returns a scannable result list.
- Exact Business ID search, for example `0112038-9`, returns the expected company.
- Eight-digit Business ID input, for example `01120389`, normalizes and searches.
- Invalid numeric input, for example `123`, shows the validation hint and does not query the API.
- `Load More Results` fetches another page on broad searches.
- `View Details` opens a nested detail view.
- Copy actions copy Business ID, EU VAT number, and address when available.
- `Command-C` copies the selected company's Y-tunnus from search results.
- `Command-O` opens the selected company's website when available.
- `Command-E` searches the official e-invoice directory using the selected company's Y-tunnus.
- Source links open YTJ search and raw PRH JSON.
- Website and map actions open only when the company has enough data.

## Screenshots

Use Raycast Window Capture so screenshots are saved into extension metadata.

1. In Raycast Advanced Preferences, configure Window Capture and enable saving to metadata.
2. Start development mode with `bun run dev`.
3. Capture these states with one consistent background:
   - Empty start view with `Get Started` and `What's New`.
   - Search results for `nokia` with split-view metadata visible.
   - Actions menu for a selected company.
   - Website action for a selected company.
   - Detail view for `0112038-9` / Nokia Oyj.
4. Check `metadata/` for the generated screenshots before publishing.

Avoid sensitive data and keep the screenshots focused on Raycast only.
