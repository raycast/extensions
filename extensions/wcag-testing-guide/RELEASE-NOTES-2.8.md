# WCAG Testing Guide v2.8 — layout and About Me updates

## Fixed
- Long “Not applicable” labels no longer overlap the notes/evidence column in HTML/PDF reports.
- Detailed results use 27% / 8% / 23% / 42% column allocation (criterion / level / result / evidence), and status badges can wrap without clipping. Narrow-screen tables can be scrolled horizontally with the keyboard.

## About Me
- Added **A11y Audit** (https://www.a11y-audit.eu/), Łukasz Krause’s free web accessibility checker using axe-core or Lighthouse. It helps identify potential issues but does not replace manual testing.
- Added **Visit A11y Audit** to the About Me actions, retained Cats & Tests and optional Buy Me a Coffee.
- Updated the short author footer in HTML/PDF exports.

## Validation
- Run `npm run validate-content && npm test` for offline checks.
- Run `npm ci && npm run check && npm run dev` on macOS for full Raycast verification.
- Review exported PDF with a screen reader and PDF accessibility checker: tagged output alone does not guarantee PDF/UA compliance.
