# Parser fixtures

Minified `React.createElement` modules in the shape `@central-icons-react`
publishes, used by `parser-parity.test.ts` to hold the two parsers to the same
output.

**The geometry here is synthetic.** Every `d`, `cx`, `points` and `transform`
value was written for this test — none of it is Central Icon System artwork.
The Central Icon System is a commercial set whose licence forbids publishing
the icons or their parts, so real modules cannot live in a public repository
even as test data. What is reproduced is the _module structure_: the wrapper
component, the `ariaLabel` alias string, and the element nesting.

Each file isolates a construct the parser has to survive:

| File                 | Construct                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `plain-path.mjs`     | Single `path`, the common case                                                                                   |
| `clip-path-defs.mjs` | `<g clipPath>` wrapping siblings, plus a trailing `<defs>` — the nesting that defeated the original regex parser |
| `nested-groups.mjs`  | `<g>` inside `<g>`, with attributes on both                                                                      |
| `fill-rule.mjs`      | `fillRule`/`clipRule` — camelCase props needing kebab-case output                                                |
| `primitives.mjs`     | `circle`, `rect`, `ellipse`, `line`, `polyline`, `polygon`                                                       |
| `escapes.mjs`        | Quotes and backslashes inside attribute values                                                                   |
| `no-aliases.mjs`     | `ariaLabel` absent, so keywords fall back to empty                                                               |

When adding a parser capability, add a fixture for it here rather than
widening an existing one — a fixture that covers one thing tells you which
thing broke.
