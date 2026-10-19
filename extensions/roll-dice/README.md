# Roll

A Raycast extension for rolling dice. Type `roll 1d6 2d10` in the root search and
the grand total appears in a HUD, and is copied to your clipboard.

## Usage

| Input      | Rolls                               |
| ---------- | ----------------------------------- |
| `1d6`      | one six-sided die                   |
| `1d6 2d10` | one d6 plus two d10s                |
| `2d6+3`    | two d6s, with 3 added to the result |
| `d20`      | one d20 — the count defaults to 1   |
| `1d20 5`   | one d20 plus a flat 5               |
| _(empty)_  | one d20                             |

Terms may be separated by spaces, by `+`, or by nothing at all, so `1d6 2d10`,
`1d6 + 2d10` and `1d6+2d10` are equivalent. A signed number written flush against
a group modifies that group (`1d20+5`); separated by a space it is a flat
addition (`1d20 5`). Notation is case-insensitive.

Unreadable input shows a toast naming the term at fault. A roll is limited to
1000 dice of at most 1,000,000 sides each.

## Development

```sh
npm install
npm run dev     # load the extension into Raycast
npm run lint    # eslint + prettier
npm run build
```
