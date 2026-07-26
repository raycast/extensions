# Keywords widen matching, they don't reorder it

Screenshots in this folder are evidence, not store assets — anything in
`metadata/` is published as a store screenshot, so these live here instead.

`src/keywords.json` attaches `us` to 🇺🇸 and `uk` to 🇬🇧 (see
`scripts/build-keywords.py`). Both keywords work, and neither reaches the top:

| Query | 1st                        | 2nd                      | 3rd                |
| ----- | -------------------------- | ------------------------ | ------------------ |
| `us`  | 🇺🇲 `u.s._outlying_islands` | 🇻🇮 `u.s._virgin_islands` | 🇺🇸 `united_states` |
| `uk`  | 🇺🇦 `ukraine`               | 🇬🇧 `united_kingdom`      |                    |

The entries that outrank them carry no `us`/`uk` keyword whatsoever. They win on
their **titles**: `u.s._outlying_islands` contains "u.s.", `ukraine` begins with
"uk". Raycast's built-in filtering ranks a title match above a keyword match, so
keyword quality cannot change the order.

The consequence worth remembering before adding more keywords: they decide
whether something appears in the results at all, never where. Reordering would
mean setting `filtering={false}` on the `Grid` and scoring all 3,608 items by
hand on every keystroke — which also gives up Raycast's in-title match
highlighting, and its matcher is better tuned than a hand-rolled one for the
queries that already work. Both flags land above the fold, so this is documented
rather than fixed.
