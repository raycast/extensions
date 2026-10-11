# Wordle Changelog

## [Board View Redesign] - {PR_MERGE_DATE}

- Show the game as a Wordle board with six rows of tiles and a keyboard of used letters that never changes size
- Keep the board visible after winning or losing and reveal the word after a loss
- Show an error toast instead of opening "How To Play" when pressing Enter on an invalid guess
- Show the board in the history summary and redraw "How To Play" with example tiles
- Replace the emoji and the extension icon with a tile-style design

## [Initial Version] - 2023-02-08

- Add `Play` command for German (DE) & English (US) word sets
- Add `Show History` command to keep track of past puzzles
