# change-case

Transform a string between various cases.

Included case transformations:
- `camelCase`
- `Capital Case`
- `CONSTANT_CASE` (same as `MACRO_CASE`)
- `dot.case`
- `Header-Case` (same as `Train-Case`)
- `kebab-case` (same as `param-case`)
- `lower case`
- `lower First`
- `MACRO_CASE` (same as `CONSTANT_CASE`)
- `no case`
- `param-case` (same as `kebab-case`)
- `PascalCase`
- `Pascal_Snake_Case`
- `path/case`
- `rAndOm cAsE` (same as `SPonGE CasE`)
- `Sentence case`
- `snake_case`
- `sWAP cASE`
- `Title Case`
- `UPPER CASE`
- `Upper first`
- `SPonGE CasE` (same as `rAndOm cAsE`)
- `Train-Case` (same as `Header-Case`)

## Caveats

Cases such as `Title Case` and `Sentence case` do not automatically pre-lowercase the text. This means that an input of `THIS IS A SENTENCE` does not get modified when transforming into those those cases. This is an intentional design choice by the author of the library that this extension uses internally, [change-case](https://github.com/blakeembrey/change-case).

For more information, please see:
- https://github.com/blakeembrey/change-case/issues/308
- https://github.com/raycast/extensions/issues/10594
