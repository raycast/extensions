# regex

Test a regex pattern against text.

## Raycast command

The Raycast Command should be `Regex Tester`. It should be a live tester with
pattern, flags, and text input. The text field should be seeded from selected
text or clipboard when available.

The result view should update as the user edits the pattern, flags, or text. It
should show match count, match ranges, captured groups, and a readable markdown
preview of matched text.

## Inputs

- `PATTERN` required: Rust regex syntax.
- `TEXT` optional: text, file path, or stdin.

## Options

- `--flags <FLAGS>`: `g` find all, `i` case-insensitive, `m` multiline, `s` dot-all, `x` extended; default `g`.
- Global: `--json`, `--quiet`, `--output`.

## Output

Regex match results.

## Raycast parameters

- `pattern`: text field for Rust regex syntax.
- `flags`: checkbox or dropdown controls for `g`, `i`, `m`, `s`, and `x`; default `g`.
- `text`: text area for input text, seeded from selected text or clipboard when available.

## Raycast actions

- `Copy Matches`: copy all matched strings.
- `Copy First Match`: copy the first matched string.
- `Copy JSON Result`: copy structured match data.
- `Copy Pattern`: copy the current regex pattern.
- `Clear Input`: clear the current text input.

## Result sections

- Summary: match count and active flags.
- Matches: matched text with start and end offsets.
- Captures: capture groups for each match when present.
- Preview: markdown representation of the input with matched ranges called out as clearly as Raycast allows.

## V2 ideas

- Add a file picker mode for testing a pattern against a local text file.
- Add replacement/substitution support if the CLI adds it.
- Add regex examples or snippets if users need syntax help.
