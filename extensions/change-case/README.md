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

By default, cases do not automatically pre-lowercase the text. This means that an input of `THIS IS A TEST SENTENCE` does not get modified when transforming to sentence case, title case, among others. This is an intentional design choice by the author of the library that this extension uses internally, [change-case](https://github.com/blakeembrey/change-case). 

Basically, the library doesn't pre-lowercase the text is because:
1. Words like `iPhone` and `NASA` would be transformed into `iphone` and `nasa`, which is generally not the desired behavior. It's not possible to include these words as a built-in library exception because there are too many exceptions to account for.
2. The library is also intended for context-aware conversion between cases, eg from snake case to sentence case. For example, `hereAreSomeWords` to `Here are some words`. If the text was pre-lowercased, the transformation would result in `herearesomewords`, which is not the desired output.

See the relevant GitHub issues for more information:
- https://github.com/blakeembrey/change-case/issues/308
- https://github.com/raycast/extensions/issues/10594

If you would like to pre-lowercase the text before transforming it, you can enable the `Lowercase Text Before Changing Case` preference in the extension settings. This lowercases all text input before every transformation. Additionally, context-aware transformations, (mentioned above) will stop working when this setting is enabled.

For more information, please see:
- https://github.com/raycast/extensions/issues/11878
