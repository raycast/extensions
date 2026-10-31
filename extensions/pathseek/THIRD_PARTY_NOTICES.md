# Third-party notices

## Fuzzy File Search (Raycast Extension)

- Source: https://github.com/raycast/extensions/tree/main/extensions/fuzzy-file-search
- Original extension author: `erykksc` (with contributions from `gilitos92`)
- License: MIT (as declared in its `package.json`)

PathSeek takes inspiration from Fuzzy File Search's full-path search interface, `fd`/`fzf` integration, and Finder actions. The persistent-index implementation in PathSeek is independently developed and does **not** copy the original command's per-launch reindexing workflow.

The PathSeek icon is an original design. Its source is available at `assets/pathseek-icon.svg`, and the rendered icon is `assets/extension-icon.png`.\n\nIf source code is migrated verbatim in subsequent phases, keep its relevant original copyright notices and license text here.

## Command-line dependencies

- `fd` — https://github.com/sharkdp/fd — user-installed executable
- `fzf` — https://github.com/junegunn/fzf — user-installed executable

The development version **does not download or bundle executables**. Install these trusted command-line tools separately, e.g. using Homebrew.

### Upstream MIT license notice (Fuzzy File Search)

```text
MIT License

Copyright (c) 2021 Raycast

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
