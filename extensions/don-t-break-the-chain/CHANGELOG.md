# Don't Break the Chain Changelog

## [Initial Version] - 2026-08-23

- Menu bar mini calendar drawn as a bare grid: one cell per real day, an ✕ through finished days, no day numbers and no days borrowed from neighbouring months
- Click any day to cross it off, including days in past months
- Week can start on Monday, Sunday, or Saturday
- Two day styles: hand-drawn boxes with an ✕, or ⬜ / ✅
- Optional day letters above the grid
- Five independent chains (Chain 2–5 disabled by default), each with its own marks, displayed month, and name
- Months never roll over on their own — ◀︎ and ▶︎ step through them by hand
- Marks are stored on disk as well as in LocalStorage so history survives reloads and updates
- Export command writes every month of every chain to a text file, drawn the same way
