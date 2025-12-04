# change-case

Transform a string between various cases.

Included case transformations:

- `camelCase`
- `Capital Case`
- `CONSTANT_CASE` (aka `MACRO_CASE`)
- `dot.case`
- `Header-Case` (aka `Train-Case`)
- `lower case`
- `lower First`
- `no case`
- `kebab-case` (aka `param-case`)
- `KEBAB-UPPER-CASE`
- `PascalCase`
- `Pascal_Snake_Case`
- `path/case`
- `rAndOm cAsE` (aka `sPonGE cAsE`)
- `Sentence case`
- `snake_case`
- `sWAP cASE`
- `Title Case`
- `UPPER CASE`
- `Upper first`

## Advanced Preferences

### Preserve Casing

By default, cases do not automatically pre-lowercase the text. This means that an input of `THIS IS A TEST SENTENCE` does not get modified when transforming to sentence case, title case, among others. This is an intentional design choice by the author of the library that this extension uses internally, [change-case](https://github.com/blakeembrey/change-case). 

Basically, the library doesn't pre-lowercase the text is because:
1. Words like `iPhone` and `NASA` would be transformed into `iphone` and `nasa`, which is generally not the desired behavior. It's not possible to include these words as a built-in library exception because there are too many exceptions to account for.
2. The library is also intended for context-aware conversion between cases, eg from snake case to sentence case. For example, `hereAreSomeWords` to `Here are some words`. If the text was pre-lowercased, the transformation would result in `herearesomewords`, which is not the desired output.

See the relevant GitHub issues for more information:
- https://github.com/blakeembrey/change-case/issues/308
- https://github.com/raycast/extensions/issues/10594

If you would like to pre-lowercase the text before transforming it, you can disable the `Preserve Casing` preference (enabled by default) in the extension settings. This lowercases all text input before every transformation. Additionally, context-aware transformations, (mentioned above) will stop working when this setting is enabled.

For more information, please see:
- https://github.com/raycast/extensions/issues/11878

### Exceptions

You can add custom exceptions to the list of words that should not be modified when transforming the text to title case or sentence case. This is useful for words like `iPhone` and `NASA` that should not be lowercased when transforming text.

It also always includes [these](https://github.com/blakeembrey/change-case/blob/17a27ce064572920f11f44b3686a9f9cf422e9c7/packages/title-case/src/index.ts#L20-L57) words.
