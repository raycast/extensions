# Wordle Solver

Suggests the next best Wordle guess from your prior guesses and color feedback. The solver maximizes expected information gain (3Blue1Brown style) over the candidate answer set, with a sigmoid frequency-rank prior to favor more common words on close calls.

## How to use

1. Open the **Solve Wordle** command. The first suggestion is always `salet`.
2. Type your guess into the search bar and press `↵` to lock it in.
3. For each letter, set the color Wordle showed you:
   - `↵` cycles the selected tile gray → yellow → green → gray
   - `⌘↑` / `⌘↓` cycle in either direction
4. Once all five tiles are colored, the next suggestion appears. Repeat until solved.

The second guess uses a precomputed lookup keyed on the 243 possible patterns from `salet`, so it returns instantly. Turns 3+ run a live entropy search over the surviving candidates.
