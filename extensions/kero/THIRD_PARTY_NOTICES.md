# Third-party resources

## Kero

- Upstream: <https://github.com/egoist/kero>
- Source revision: `09eb1d42dfe24c8ffc07600024e152e096532519` (Kero 2.1.35)
- License: MIT, copyright (c) 2026 EGOIST. Full text: [`assets/licenses/Kero-MIT.txt`](assets/licenses/Kero-MIT.txt).
- `assets/extension-icon.png` is derived from upstream `resources/icon.png`, resized from 1024 × 1024 to 512 × 512 with macOS `sips`. No artwork or colors were changed.
- Original PNG SHA-256: `45fdbdfbe07e213a97cf0e2e71830cf37cbea174da8bfb1877ffa385001bdfc4`.

To reproduce the extension icon from a checkout of this revision:

```bash
sips -z 512 512 /path/to/kero/resources/icon.png --out assets/extension-icon.png
```

Kero's name and artwork identify the application this extension integrates with; their use does not imply endorsement by the Kero author.

## Interface and program icons

The SVG files in `assets/kero/` are copied **byte-for-byte** from the `icons/` directory of the Kero revision above. Only assets used by this extension are included. Their original third-party licenses apply separately from Kero's MIT license:

| Bundled files         | Original source                                                      | License                                                                                       |
| --------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `f7-*.svg`            | [Framework7 Icons](https://github.com/framework7io/framework7-icons) | MIT, copyright (c) 2016 Vladimir Kharlampidi; [full text](assets/licenses/Framework7-MIT.txt) |
| `meteor-terminal.svg` | [Meteor Icons](https://github.com/zkreations/meteor)                 | MIT, copyright (c) 2022 zkreations; [full text](assets/licenses/Meteor-MIT.txt)               |

Upstream Kero documents these sources in [`icons/README.md`](https://github.com/egoist/kero/blob/09eb1d42dfe24c8ffc07600024e152e096532519/icons/README.md). The two interface-icon license files were compared byte-for-byte with their original sources; pinned references are in the [bundled asset notices](assets/licenses/NOTICE.md#interface-icons). All seven interface SVGs are retained unchanged.

### Program-logo licenses

The `si-*.svg` files are obtained through Simple Icons / Iconify and Kero, but **Simple Icons' project-level CC0 dedication does not mean every logo is CC0**. Individual copyright licenses and brand guidelines must be considered separately.

The [bundled asset notices](assets/licenses/NOTICE.md) are the per-file inventory for all 18 program-logo SVGs. They contain the creator credits, pinned source evidence, license links, and rendering-change disclosures that accompany the distributed assets:

- **Git Logo by Jason Long**: CC BY 3.0 Unported; [full legal code](assets/licenses/CC-BY-3.0.txt).
- **Deno**: MIT, copyright (c) 2018-2024 the Deno authors; [full text](assets/licenses/Deno-MIT.txt).
- **GitHub Copilot Octicon**: MIT, copyright (c) 2026 GitHub Inc.; [full text](assets/licenses/GitHub-Octicons-MIT.txt).
- **The other 15 program logos remain under review**, individually listed in [the pending inventory](assets/licenses/NOTICE.md#program-icons-review-pending). They have not been removed or relicensed. In particular, Neovim's separate license/attribution chain remains unresolved; it must not be described as confirmed CC0.

The existing [Simple Icons CC0 text](assets/licenses/Simple-Icons-CC0.txt) is retained for the project material it actually covers, not as a blanket authorization for the logos. Completing copyright notices does not establish trademark permission or approve the current recoloring of every brand. Program logos identify the software running in a pane and do not imply endorsement.

The notices are kept inside `assets/licenses/` so the credits and full license texts accompany Raycast's asset distribution, rather than existing only in this repository.

`src/lib/icons.ts` adapts the program-name mapping, selection order (browser, then agent → process → runtime → terminal), and Claude/Gemini brand colors from Kero's [`icons.go`](https://github.com/egoist/kero/blob/09eb1d42dfe24c8ffc07600024e152e096532519/icons.go), under the [Kero MIT license](assets/licenses/Kero-MIT.txt). SVGs are tinted by Raycast at runtime: agent brand colors are retained; Raycast's dynamic text colors replace Kero's theme-specific neutral colors. Status tags retain Raycast's semantic colors. Native Raycast warning icons are retained where no corresponding Kero asset is used.

No runtime access to a Kero source checkout is required.

## Fonts

Kero bundles JetBrains Mono Nerd Font under the SIL Open Font License. These font files are **not redistributed** here: Raycast's native list UI has no custom font-family interface, so this extension uses Raycast's native typography rather than shipping unused fonts.
