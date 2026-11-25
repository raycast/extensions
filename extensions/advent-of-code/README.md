# Advent of Code

Read [Advent of Code](https://adventofcode.com) puzzles, copy your input, submit answers and follow your private leaderboards without leaving Raycast.

## Commands

- **Today's Puzzle**: the latest unlocked puzzle, with actions to copy your input and submit your answer
- **Browse Puzzles**: every puzzle from every event, with the stars you've earned
- **Private Leaderboard**: scores, stars and solve times for each member
- **Puzzle Countdown**: the time until the next puzzle unlocks, in the menu bar during the event and the month before it

## Setup

Puzzles can be read without an account. To copy your input, submit answers, see your stars or open a private leaderboard, add your session cookie:

1. Log in to [adventofcode.com](https://adventofcode.com).
2. Open your browser's developer tools and find the cookie named `session` for adventofcode.com (in Chrome: **Application → Cookies**, in Safari: **Storage → Cookies**, in Firefox: **Storage → Cookies**).
3. Copy its value into the **Session Cookie** preference of this extension.

The cookie lasts about a month. If commands start asking for it again, copy a fresh one.

The leaderboard command opens the first private leaderboard you're on, and **Switch Leaderboard…** in the action panel moves to the others. To always open a specific one, set **Private Leaderboard ID** to the number at the end of its URL, for example `https://adventofcode.com/2026/leaderboard/private/view/123456`.

## Being kind to Advent of Code

This extension follows the [automation guidelines](https://www.reddit.com/r/adventofcode/wiki/faqs/automation) of Advent of Code:

- Puzzle inputs are downloaded once and cached on your computer.
- Private leaderboards are refreshed at most once every 15 minutes.
- Puzzle and calendar pages are cached for 15 minutes, and refreshed right after you solve a part.
- Every request identifies the extension with a `User-Agent` header.

This is an unofficial extension. It is not affiliated with or endorsed by Advent of Code.
