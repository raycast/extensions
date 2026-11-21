# Third-party asset notices

This notice and the adjacent license texts accompany the extension's distributed assets. The extension's own MIT license does not replace the licenses of third-party artwork. Copyright-license identification below is not trademark permission or a complete brand-use clearance.

## Kero

Copyright (c) 2026 EGOIST. [MIT license](Kero-MIT.txt).

Source: [Kero revision 09eb1d42dfe24c8ffc07600024e152e096532519](https://github.com/egoist/kero/tree/09eb1d42dfe24c8ffc07600024e152e096532519).

- `extension-icon.png` is derived from `resources/icon.png`, resized from 1024 × 1024 to 512 × 512. Artwork and colors were otherwise unchanged.
- The extension adapts the program-name mapping, icon selection order, and Claude/Gemini colors from `icons.go`.
- The SVG assets were copied byte-for-byte from Kero's `icons/` directory. Kero's [source notes](https://github.com/egoist/kero/blob/09eb1d42dfe24c8ffc07600024e152e096532519/icons/README.md) identify the original icon collections; their licenses apply separately below.

## Interface icons

- `kero/f7-arrow-branch.svg`, `kero/f7-arrow-clockwise.svg`, `kero/f7-arrow-up-right-square.svg`, `kero/f7-doc-on-doc.svg`, `kero/f7-gear-alt.svg`, and `kero/f7-globe.svg`: Framework7 Icons, copyright (c) 2016 Vladimir Kharlampidi. [MIT license](Framework7-MIT.txt); [upstream license](https://github.com/framework7io/framework7-icons/blob/7fb38494ba82cbef74d4f7e725431544c8ea1ee5/LICENSE).
- `kero/meteor-terminal.svg`: Meteor Icons, copyright (c) 2022 zkreations. [MIT license](Meteor-MIT.txt); [upstream license](https://github.com/zkreations/meteor/blob/30b181881d7e62b016f84616a88af8c8eb351b0c/LICENSE).

## Program icons: copyright licenses identified

Asset paths are relative to the extension's `assets/` directory.

| Asset                       | Attribution                                     | Copyright license                   |
| --------------------------- | ----------------------------------------------- | ----------------------------------- |
| `kero/si-git.svg`           | Git Logo by Jason Long                          | [CC BY 3.0 Unported](CC-BY-3.0.txt) |
| `kero/si-deno.svg`          | Copyright (c) 2018-2024 the Deno authors        | [MIT](Deno-MIT.txt)                 |
| `kero/si-githubcopilot.svg` | Copyright (c) 2026 GitHub Inc.; Copilot Octicon | [MIT](GitHub-Octicons-MIT.txt)      |

### Git

The bundled icon is a monochrome SVG adaptation of **Git Logo by Jason Long**, obtained through Simple Icons / Iconify and Kero. The extension preserves the SVG bytes from Kero and applies Raycast's theme-dependent tint at runtime; it does not preserve the original logo's orange presentation.

- Original work, creator credit, and license declaration: <https://git-scm.com/community/logos.html>.
- Pinned copy of that declaration: [Git website source](https://github.com/git/git-scm.com/blob/128a0d9c1f7eaa5678ea9a10257c9c0680786590/content/community/logos.html).
- License: [Creative Commons Attribution 3.0 Unported](https://creativecommons.org/licenses/by/3.0/), with the full legal code in [CC-BY-3.0.txt](CC-BY-3.0.txt).
- The bundled legal code was copied unchanged from [SPDX license-list-data](https://github.com/spdx/license-list-data/blob/ab9b0904b43db6f4b67431efd8821feb821f1c8b/text/CC-BY-3.0.txt).

### Deno

The icon is derived from the Deno logo identified by Simple Icons in the [Deno documentation repository](https://github.com/denoland/docs/blob/5dee713844c7447f80acd4093caa9d350d80bf36/static/img/logo.svg). The full [MIT license at that same revision](https://github.com/denoland/docs/blob/5dee713844c7447f80acd4093caa9d350d80bf36/LICENSE), including the Deno authors' copyright notice, is reproduced in [Deno-MIT.txt](Deno-MIT.txt).

### GitHub Copilot

The icon is derived from the [Copilot 24px Octicon](https://github.com/primer/octicons/blob/68ec2de8d0ddfcbb7497da01d0b7d98eb5593020/icons/copilot-24.svg), which Simple Icons identifies as its source. The full [Octicons MIT license at that revision](https://github.com/primer/octicons/blob/68ec2de8d0ddfcbb7497da01d0b7d98eb5593020/LICENSE), including GitHub Inc.'s copyright notice, is reproduced in [GitHub-Octicons-MIT.txt](GitHub-Octicons-MIT.txt). This identifies the copyright license for the Octicon, not a separate authorization to use GitHub's brands.

### Shared rendering changes

Program icons are monochrome SVG representations obtained through Simple Icons / Iconify and Kero. The extension makes no further changes to their SVG bytes. Raycast applies colors at runtime: Claude/Gemini agent colors are retained, while other program icons use dynamic text colors and exited panes use a muted color. These rendering changes are not a claim that each brand permits recoloring.

## Program icons: review pending

The following assets remain in the extension unchanged. Their inclusion here records an unresolved review, **not** permission to redistribute or commercially use them. No blanket CC0 claim is made for these logos.

| Asset                      | Review status                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kero/si-amp.svg`          | Pending; Simple Icons' AMP entry points to amp.dev, so the intended program identity also needs checking.                                           |
| `kero/si-bun.svg`          | Pending individual copyright-license and brand-use review.                                                                                          |
| `kero/si-claude.svg`       | Pending individual copyright-license and brand-use review.                                                                                          |
| `kero/si-cline.svg`        | Pending individual copyright-license and brand-use review.                                                                                          |
| `kero/si-cursor.svg`       | Pending individual copyright-license and brand-use review.                                                                                          |
| `kero/si-docker.svg`       | Pending individual copyright-license and brand-use review.                                                                                          |
| `kero/si-googlegemini.svg` | Pending individual copyright-license and brand-use review.                                                                                          |
| `kero/si-kimi.svg`         | Pending individual copyright-license and brand-use review.                                                                                          |
| `kero/si-neovim.svg`       | Pending; Simple Icons records CC BY-SA 3.0, but the original attribution and authorization chain have not been independently resolved for this SVG. |
| `kero/si-nodedotjs.svg`    | Pending individual copyright-license and brand-use review.                                                                                          |
| `kero/si-openai.svg`       | Pending individual copyright-license and brand-use review.                                                                                          |
| `kero/si-opencode.svg`     | Pending individual copyright-license and brand-use review.                                                                                          |
| `kero/si-python.svg`       | Pending individual copyright-license and brand-use review.                                                                                          |
| `kero/si-qwen.svg`         | Pending individual copyright-license and brand-use review.                                                                                          |
| `kero/si-vim.svg`          | Pending individual copyright-license and brand-use review.                                                                                          |

## Simple Icons and trademarks

Simple Icons' project-level [CC0 1.0 Universal dedication](Simple-Icons-CC0.txt) is retained for the material it covers. It does **not** establish that every included brand logo is CC0. Simple Icons explicitly requires users to consider individual licenses and brand guidelines in its [disclaimer](https://github.com/simple-icons/simple-icons/blob/32e030086fdc605196391aab28519b14dc4295b4/DISCLAIMER.md).

The per-icon metadata consulted is pinned at [Simple Icons revision 32e030086fdc605196391aab28519b14dc4295b4](https://github.com/simple-icons/simple-icons/blob/32e030086fdc605196391aab28519b14dc4295b4/data/simple-icons.json). This is a license-review reference, not a claim that all bundled SVGs were copied from that Simple Icons revision; the actual copied bytes are from the Kero revision above.

Names and logos identify the software with which the extension interacts. Their use does not imply sponsorship or endorsement by Kero, Git, Deno, GitHub, or any other brand owner. Copyright-license notices do not settle trademark, recoloring, or product-branding questions.
