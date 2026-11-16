# Third-party notices

The extension's own source and original card icon are MIT licensed. The renderer and fonts retain their respective licenses.

| Component                                                | Source                                    | License / shipped notice                                   |
| -------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| Xeet rendering engine and JavaScript ABI                 | https://github.com/rauchg/xeet            | Apache-2.0, `assets/xeet/licenses/Xeet-Apache-2.0.txt`     |
| Noto Sans, Arabic, Hebrew, Math, Symbols, Symbols 2      | https://github.com/notofonts/noto-fonts   | SIL OFL 1.1, `assets/xeet/licenses/Noto-OFL.txt`           |
| Noto Sans CJK JP regular and bold                        | https://github.com/notofonts/noto-cjk     | SIL OFL 1.1, `assets/xeet/licenses/NotoSansCJK-OFL.txt`    |
| Xeet Preview Emoji, derived from Noto Color Emoji v2.051 | https://github.com/googlefonts/noto-emoji | SIL OFL 1.1, `assets/xeet/licenses/NotoColorEmoji-OFL.txt` |
| STIX Two Math                                            | https://github.com/stipub/stixfonts       | SIL OFL 1.1, `assets/xeet/licenses/STIX-OFL.txt`           |

Noto and STIX font bytes are unchanged except for the explicitly renamed emoji derivative. That derivative converts CBDT PNG strike data to `sbix` using the author’s font conversion script; it does not change the emoji artwork. All original font copyright and license name records are retained. The font files are not offered for sale separately.

This build uses Noto Sans regular for the primary 400/500 weight slots and Noto Sans bold for 700/800. Xeet's internal family aliases and enum names are retained for engine compatibility; they do not mean the proprietary fonts are present. No Chirp, Arial, Apple Color Emoji, Hiragino Sans, or upstream default-avatar image is shipped by the extension.

The exact engine revision and font hashes are in `assets/xeet/provenance.json`. Full license texts accompany the distributed assets. `assets/xeet/licenses/Rust-Dependencies.txt` contains notices for the WASM dependency graph; `rust-inventory.json` records versions, licenses, and source repositories. Consult the lockfile for JavaScript dependency versions.
