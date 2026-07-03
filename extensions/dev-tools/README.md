# Dev Tools

A bundle of small developer utilities for [Raycast](https://www.raycast.com/) — the kind of one-off tasks you reach for constantly: encoding and decoding, encrypting, formatting and minifying, converting between data formats, inspecting tokens, and converting numbers, colors, and timestamps. Each tool is a self-contained command, so you launch straight into the one you need.

Everything runs **locally and offline**. The only command that ever touches the network is JWT signature verification, and only when you explicitly ask it to.

## Tools

### Encoding & encryption

- **AES En-/Decryptor** — Encrypt and decrypt text and files with AES. Pick the cipher mode (`CTR` for legacy byte-compatibility, `GCM` for authenticated encryption that fails loudly on the wrong password), the output encoding (Base 64 / Hex), key length (128/192/256), and password-derivation hash. The password and derived key live in memory only — never displayed, copied, or written to disk.
- **Text Encoder/Decoder** — A live two-way form: edit the text to encode, edit the encoded value to decode. Supports Base 64, Base 64 URL-safe, Base 32, Hex, URL/percent, and Binary, with a selectable text encoding (UTF-8 / UTF-16 LE / Latin-1). Decoders are lenient about whitespace, separators, and alphabet variants.
- **Base64 Encode** / **Base64 Decode** / **URL Encode** / **URL Decode** — One-shot clipboard shortcuts that transform the clipboard in place and report via HUD.

### Text

- **Text Analyzer** — Analyze clipboard or typed text: counts (characters, words, lines, sentences, paragraphs), UTF-8 byte size, encoding details (code points, UTF-16 units, grapheme clusters, non-ASCII), readability and timing, character-class breakdown, and a sortable character-distribution view. Every metric is copyable, plus Copy Report / Copy as JSON.
- **Unicode Browser** — A grid of Unicode characters you can browse by block (grouped by plane) or search by name, code point (`U+1F600`, `0x41`, `2603`), or the literal character. Open any character for full details — name, block, plane, general category, UTF-8/UTF-16 bytes, and the Unicode version it was added in — and copy it as character, code point, name, HTML entity, or JS escape. Built from the Unicode Character Database 16.0.0.
- **Lowercase** / **Uppercase** — Clipboard shortcuts that change the text's case in place (preserving surrounding whitespace) and report via HUD.

### Numbers & time

- **Number Base Converter** — Type a number into the search bar to see it in binary, octal, decimal, and hexadecimal live, plus a Unicode code-point preview. Source base auto-detects from a `0x`/`0b`/`0o` prefix or can be forced. Uses `BigInt`, so arbitrarily large integers convert exactly.
- **Unix Timestamp** — Convert a Unix timestamp to a human-readable date, or a date string back to a timestamp. The unit (seconds / milliseconds / microseconds / nanoseconds) auto-detects from the magnitude or can be forced. Shows Local, UTC, ISO 8601, RFC 2822, and relative time, plus the instant in every unit. With the field empty it shows the live current epoch.
- **Cron Expression** — Type a cron expression for a plain-English description, a per-field breakdown, and a preview of the next run times. Supports 5-field cron, 6-field with a leading seconds field, `@yearly`/`@monthly`/`@weekly`/`@daily`/`@hourly` macros, month/weekday names, and the `*` `,` `-` `/` `?` operators.
- **Decimal to Hexadecimal** / **Hexadecimal to Decimal** / **Decimal to Binary** / **Binary to Decimal** — Clipboard shortcuts that convert the clipboard in place and report via HUD.

### Color

- **Color Converter** — Enter a color as hex, `rgb()`, `hsl()`, `hsv()`, `hwb()`, `oklch()`, or a CSS name. The overview shows every format (plus the matching CSS name), a shades/tints ramp, and harmonies — all copyable. Switch to the editor to nudge any channel of any model (OKLCH / HWB / HSL / HSV / RGB) with the keyboard.

### Tokens & data formats

- **JWT Inspector** — A read-only debugger for JSON Web Tokens. Import a token (from the clipboard or by pasting) and browse its header and payload as a list of labelled claims, with the full header/payload shown as syntax-highlighted JSON. Timestamp-looking values are rendered as human-readable dates (`exp`/`nbf`/`iat` relative, with an expired/valid/future indicator). Copy any claim, or the whole header, payload, encoded token, or signature. On request it verifies the signature — resolving the public key from the token's own header or its issuer's OIDC discovery document, or from an HMAC secret / PEM key you supply. **Decoding is fully local; verification is the only thing that makes a network request, and only when you ask.**
- **JSON Converter** — Convert structured data between JSON, JSON5, YAML, TOML, JS/TS objects, XML, CSV/TSV, `.env`, and URL query strings. The source format auto-detects (with a manual override), and JS input is *evaluated* in a sandbox so a pasted snippet becomes data. JS/TS output is configurable (quote style, bare vs. quoted keys, declaration wrapper, semicolons, trailing commas, `as const`), and indentation and key sorting apply across formats.
- **Format JSON** / **Minify JSON** / **JSON to YAML** / **YAML to JSON** / **JSON to JS Object** — Clipboard shortcuts that transform the clipboard in place and report via HUD.

### Code formatters

Live forms that prefill from the clipboard and pretty-print as you type, with per-command settings (indent, print width, quotes, semicolons, trailing commas, prose wrap; SQL dialect and keyword case) remembered between runs. Powered by Prettier (plus `@prettier/plugin-xml`) and `sql-formatter`.

- **Format JavaScript**, **Format TypeScript**, **Format CSS**, **Format SCSS**, **Format Less**, **Format HTML**, **Format XML**, **Format SQL**, **Format Markdown**, **Format YAML**

### Code minifiers

Live minification with per-command settings. JavaScript/TypeScript use terser (TypeScript is type-stripped first), CSS uses clean-css, HTML uses html-minifier-terser (minifying inline JS/CSS too), and XML/SQL collapse whitespace while preserving literals and CDATA.

- **Minify JavaScript**, **Minify TypeScript**, **Minify CSS**, **Minify HTML**, **Minify XML**, **Minify SQL**

## Development

```bash
npm install
npm run dev        # ray develop — hot-reload into the local Raycast app
npm run build      # ray build — production build / typecheck
npm run lint       # ray lint
npm run fix-lint   # ray lint --fix
```

There is no test runner; `ray build` is the typecheck and validation gate.

## License

MIT
