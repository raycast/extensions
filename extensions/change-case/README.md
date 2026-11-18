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
- `AlTeRnAtInG cAsE`
- `rAndOm cAsE`
- `Sentence case`
- `snake_case`
- `sWAP cASE`
- `Title Case`
- `UPPER CASE`
- `Upper first`

## Advanced Preferences

### Preserve Casing

Preserve Casing is off by default. Capital Case, Title Case, and Sentence Case lowercase the input before converting it, then apply your casing exceptions. For example, Sentence Case converts `THIS IS A TEST SENTENCE` to `This is a test sentence`.

Turn on Preserve Casing to pass the original casing to those three conversions. If you used Preserve Casing before this update, you can turn it back on in the extension settings.

Code cases always use the original casing to find word boundaries. For example, Snake Case converts `hereAreSomeWords` to `here_are_some_words`. Upper First and Lower First change only the first letter.

### Exceptions

Capital Case, Title Case, and Sentence Case match exceptions case-insensitively at word boundaries. The defaults include spellings such as `iPhone`, `iOS`, and `macOS`. To keep an acronym like `NASA` uppercase, add it to the comma-separated list in Casing Exceptions.
