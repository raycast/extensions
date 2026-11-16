# bitg for Raycast

Converts Uzbek text from the old Latin alphabet (`o'`, `g'`, `sh`, `ch`) and from Cyrillic to the 2026 Latin alphabet (`ö`, `ğ`, `ş`, `ç`). English words, names, links and code are left as they are.

| Command | What it does |
|---|---|
| Convert Selected Text | Replaces the selected text in the frontmost app |
| Convert Clipboard Text | Converts the clipboard and copies the result |
| Convert Text | Shows what you type in new Latin, old Latin (`oʻ` and `o'`) and Cyrillic |

Conversion runs locally with the [bitg](https://bitg.uz) engine compiled to WebAssembly (`assets/bitg_core.wasm`). No text leaves your computer.

## Preferences

- **Keep English words** (on): `push`, `meeting` and other English words stay unchanged.
- **Convert Cyrillic** (on): Uzbek Cyrillic is converted as well as old Latin.
- **Use ASCII apostrophe** (off): writes the glottal stop as `'` instead of `ʼ` (U+02BC).

## Building `bitg_core.wasm`

The WebAssembly file is built from the open-source [`bitg-core`](https://github.com/dtwinuz/bitg/tree/main/crates/bitg-core) crate (MIT OR Apache-2.0) with the same command as the bitg.uz site and the browser extension:

```sh
cargo build -p bitg-core --release --target wasm32-unknown-unknown --target-dir target/site
cp target/site/wasm32-unknown-unknown/release/bitg_core.wasm integrations/raycast/assets/
```

## Development

```sh
npm install
npm test        # conversion tests against the real wasm
npm run dev
```
