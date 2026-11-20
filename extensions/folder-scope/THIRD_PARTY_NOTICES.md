# Third-Party Notices

Folder Scope does not ship any third-party binaries inside its package. The components below are either downloaded at runtime or are standard npm dependencies declared in `package.json`.

## ripgrep

- Project: <https://github.com/BurntSushi/ripgrep>
- Author: Andrew Gallant
- License: dual-licensed under the [MIT License](https://github.com/BurntSushi/ripgrep/blob/master/LICENSE-MIT) and the [Unlicense](https://github.com/BurntSushi/ripgrep/blob/master/UNLICENSE)

The "Bundled ripgrep" search engine downloads an official prebuilt ripgrep binary at first use. The extension can also invoke a ripgrep installation already present on the user's system.

## microsoft/ripgrep-prebuilt

- Project: <https://github.com/microsoft/ripgrep-prebuilt>
- License: [MIT License](https://github.com/microsoft/ripgrep-prebuilt/blob/main/LICENSE), Copyright (c) Microsoft Corporation
- Version used: `v13.0.0-10`

Source of the prebuilt ripgrep binaries downloaded by the bundled engine. Downloads are fetched only from this project's official GitHub releases and verified against SHA-256 checksums hardcoded in this repository before installation. The macOS builds statically link [PCRE2](https://github.com/PCRE2Project/pcre2), which is distributed under the [BSD-3-Clause license](https://github.com/PCRE2Project/pcre2/blob/master/LICENCE.md).

## npm dependencies

Runtime dependencies are limited to [`@raycast/api`](https://www.npmjs.com/package/@raycast/api) and [`@raycast/utils`](https://www.npmjs.com/package/@raycast/utils), both MIT-licensed by Raycast. Development dependencies and their licenses are listed in `package.json` and `package-lock.json`.
