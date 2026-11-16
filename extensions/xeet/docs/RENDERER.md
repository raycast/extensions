# Open-font renderer build

## Audit decision

`@xeet/core@0.1.0` embeds Chirp and Arial in its supplied WASM and ships Apple Color Emoji and Hiragino Sans in separate font packs. Its npm tarball's Apache-2.0 declaration does not establish redistribution rights for those fonts. **Do not copy that WASM or its packs into extension assets.**

This extension instead compiles upstream Xeet revision `71079ff11ab2847c1c2e5973b3901b2c7203c89d` using `XEET_VENDOR_DIR` with an explicit replacement manifest. Only Noto/STIX fonts and the renamed OFL emoji derivative are in that vendor directory. No Rust rendering code is patched or reimplemented. The upstream default avatar is omitted, invoking Xeet's neutral built-in fallback.

| Original role              | Bundled replacement                                             |
| -------------------------- | --------------------------------------------------------------- |
| Chirp and Arial            | Noto Sans regular/bold                                          |
| Apple Color Emoji          | Xeet Preview Emoji, derived from Noto Color Emoji v2.051        |
| Hiragino Sans              | Noto Sans CJK JP regular/bold                                   |
| Other script/math fallback | Original open Noto/STIX faces from the pinned upstream snapshot |

Fonts use SIL OFL 1.1. Notices are preserved under `assets/xeet/licenses/`. Font hashes are pinned in `scripts/font-lock.json`; the generated provenance records those hashes, download source revisions, the Xeet source revision, and the WASM hash. The renderer's upstream `verifiedFor`/ruleset fields describe its original layout rules, not a claim that this font substitution is pixel-identical to X.

## Rebuild

Normal `npm ci` / `npm run build` uses the committed renderer; Rust and Python are needed only when deliberately rebuilding the binary.

```sh
rustup target add wasm32-unknown-unknown --toolchain stable
rustup run stable cargo install wasm-bindgen-cli --version 0.2.130 --locked --root .build/toolchain
python3 -m venv .build/font-tools
.build/font-tools/bin/pip install fonttools==4.60.1
npm run build:renderer
npm test
npm run build
npm run test:bundle
```

The script downloads pinned sources into the ignored `.build` directory. Compilation uses the upstream Cargo lockfile, thin LTO, and SIMD, matching upstream's WASM guidance. All fonts are embedded (`XEET_FONT_PACKS=all`), producing a larger standalone module with no runtime font loader. `WASM_BINDGEN` and `FONTTOOLS_PYTHON` can override the local tools' paths.

`convert-emoji.py` translates unchanged Noto PNG glyphs from CBDT to `sbix`, which Xeet's existing painter supports. The output family is renamed **Xeet Preview Emoji**. Preserve the OFL notice and inspect emoji sequences and multilingual golden images after any change. Do not simply regenerate golden hashes to make an unexplained rendering change pass.

`scripts/icon.svg` is the editable source of the original extension icon. Run `npm run build:icon` to regenerate its 512 × 512 PNG.

## Store gate

The open-font substitution resolves the identified proprietary font packaging issue without asserting permission to distribute the upstream fonts. Raycast Store review of the WASM artifact, its source/build process, size, and complete notices is still required. Do not label this extension Store-approved until that review is complete. No reviewer or upstream maintainer has been contacted by this implementation task.
