# Layout Fixer Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Fix text typed with the wrong keyboard layout between Arabic and English,
  in either direction, with the direction detected automatically
- Converts the selection, or the whole focused text field when nothing is
  selected
- Supports both the macOS "Arabic" and Windows "Arabic (101)" layouts, which
  differ across the entire bottom row; defaults to whichever matches the
  computer you're on
- Runs on both macOS and Windows
