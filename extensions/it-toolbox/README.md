# IT Toolbox

Sixteen small utilities that come up every day, collected in one Raycast extension.

No more opening a browser tab to search for "online timestamp converter" or "md5 online" —
press `⌥Space`, type the command, hit `⏎` and copy the result.

## Commands

| Command | What it does |
| --- | --- |
| **Timestamp** | Convert between timestamps and dates, with seconds/milliseconds detected automatically. Emits ISO 8601, UTC, RFC 2822 and more. **Leave the input empty to see the current time and timestamp.** |
| **URL Encode / Decode** | Encode and decode URLs with either `encodeURIComponent` or `encodeURI`, and break a URL down into its query parameters. |
| **Base64 Encode / Decode** | Convert between plain text and Base64, URL-safe Base64, hex or binary. |
| **Hash (MD5/SHA)** | Get MD5, SHA-1, SHA-256, SHA-512 and CRC32 for the same input in one pass. |
| **UUID / ULID Generator** | Generate 1–50 UUID v4, UUID v7, ULID or NanoID values. |
| **JSON Format / Validate** | Format, minify, sort keys, validate, and generate TypeScript interfaces from JSON. |
| **JWT Decoder** | Read a JWT's header and payload and check whether it has expired. Decoding only — the signature is not verified. |
| **Radix Convert** | Convert between binary, octal, decimal, hexadecimal, Base32 and Base36. BigInt based, so nothing is lost to float precision. |
| **Text Diff** | Compare two blocks of text line by line, optionally ignoring case and whitespace, and copy the result in `diff` format. |
| **Random / Password Generator** | Generate strong passwords with a configurable character set and length, exclude ambiguous characters, and see the estimated entropy. |
| **Case Convert** | Convert between camelCase, PascalCase, snake_case, SCREAMING_SNAKE_CASE, kebab-case and dot.case. |
| **IP / CIDR Tool** | Convert between IPv4, integers and binary, work out CIDR subnet details (network, broadcast, usable range) and tell private addresses from public ones. |
| **Cron Parser** | Explain a 5-field cron expression in plain English and predict the next 10 run times. |
| **QR Code Generator** | Turn text or a URL into a QR code, and copy or open the image. |
| **Color Convert** | Convert between HEX, RGB, HSL and CMYK, with a swatch preview and WCAG AA contrast checks. |
| **Text Toolkit** | Change case, reverse, dedupe, drop empty lines, sort, and convert to a SQL `IN` list or a CSV row. Plus character, word and line counts. |

Sixteen commands covering encoding, hashing, ID generation, network maths and text handling.

## Usage

Open Raycast and type `IT Toolbox`, or search for any command directly (for example
`Timestamp`):

1. Paste your input into the form and pick a mode
2. Press `⌘ ⏎` to compute
3. On the results page, `⏎` copies, `⌘ ⇧ C` copies the detail, `⌘ ⇧ T` copies the title

### Live values without typing

Commands that are anchored to "now" — Timestamp, for instance — compute a result even with an
empty input, so you can read the current value without filling anything in first:

- Leave the input empty and you get **the current time and the current timestamp**: local
  time, seconds and milliseconds timestamps, ISO 8601 (UTC and local timezone), date, time,
  UTC string, RFC 2822, microseconds and the timezone offset, plus the start and end of today
  and of the current week
- `⌘ D` jumps straight to the live values page; `⌘ ⇧ R` refreshes it to the current instant
- Typing a value and pressing `⏎` switches to the usual conversion path; both paths render
  through exactly the same code

Long results follow one shared convention: list titles are folded automatically (whitespace
collapsed, clipped at 220 characters with a note of how many were hidden), `⏎` copies,
`⌘ ⇧ ⏎` copies the full value, `⌘ ⇧ C` copies the detail, `⌘ ⇧ P` pastes into the active app.
Detail pages report the character count, line count and longest line, and scroll automatically
for very long content.

### Privacy

Every command computes locally and nothing is uploaded — with one exception: **QR Code
Generator** requests the image from the public [QR Server](https://goqr.me/api/) API, so the
text you submit is sent to that service. Nothing else in this extension makes a network call
with your input.

## Development

```bash
npm install
npm run dev        # registers the extension with Raycast and hot-reloads
npm test           # runs the 40 toolbox self-tests
npm run lint       # code style checks
npm run build      # distribution build
```

### Layout

```
src/
├── components/
│   ├── InputForm.tsx     # shared "input → results" form, with live values support
│   └── ResultList.tsx    # shared result list, folded previews + scrollable detail
├── utils/
│   └── toolbox.ts        # every pure function, no UI dependency, reusable on its own
├── __tests__/
│   └── toolbox.test.ts   # 40 self-tests
└── *.tsx                 # one entry point per command
```

Adding a tool takes two steps: add a pure function (plus a test) to `utils/toolbox.ts`, then
write a `.tsx` file that wraps it in `InputForm` and register it in the `commands` array of
`package.json`.

## License

MIT
# raycast-it-toolbox
