# Clipboard Regex

Apply regex find-and-replace to your clipboard contents with a live preview.

## Usage

1. Copy text to your clipboard
2. Open the **Regex Replace** command
3. Type a substitution pattern in the search bar:

```
s/find/replace/flags
```

   The `s` prefix is optional — `/find/replace/flags` works too.

4. The detail panel shows a live before/after preview
5. Press Enter to copy the result to your clipboard

## Pattern Syntax

The pattern follows the sed `s` command format. The `s` prefix is optional.

| Pattern | Description |
|---|---|
| `s/foo/bar/` | Replace first occurrence of "foo" with "bar" |
| `/foo/bar/` | Same — `s` prefix is optional |
| `s/foo/bar/g` | Replace all occurrences |
| `s/foo/bar/gi` | Replace all, case-insensitive |
| `s|\d+|#|g` | Use any delimiter (helpful when pattern contains `/`) |
| `s/(\w+)/[$1]/g` | Capture groups via `$1`, `$2`, etc. |

### Flags

Standard JavaScript regex flags: `g` (global), `i` (case-insensitive), `m` (multiline), `s` (dotAll), `u` (unicode).

### Delimiters

The first non-alphanumeric character is the delimiter (the character after `s`, or the very first character if you omit `s`). Use any character that doesn't appear in your pattern to avoid escaping. Common choices: `/`, `|`, `#`, `@`.

To include the delimiter literally in your pattern, escape it with `\`.

## Tips

- The trailing delimiter is optional: `s/foo/bar` works the same as `s/foo/bar/`
- To chain multiple replacements, apply the first, then re-open the command
- The result is copied as a new clipboard entry, so your original text remains in clipboard history
