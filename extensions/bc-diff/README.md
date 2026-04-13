# Beyond Compare Diff

Compare the last two entries of your clipboard in [Beyond Compare](https://www.scootersoftware.com/).

Supports both **text** and **file** clipboard entries — if you copied two files (e.g. in Finder), they are compared directly. Otherwise the clipboard text is written to temp files and compared.

## Prerequisites

[Beyond Compare](https://www.scootersoftware.com/) must be installed on your Mac with the `bcomp` command line tool available.

### Install via Homebrew (recommended)

```sh
brew install --cask beyond-compare
```

This installs Beyond Compare and symlinks `bcomp` to `/usr/local/bin/bcomp` automatically.

### Install manually

1. Download Beyond Compare from [scootersoftware.com/download](https://www.scootersoftware.com/download)
2. Drag **Beyond Compare.app** to `/Applications`
3. Install the command line tool: open Beyond Compare, go to **Beyond Compare** menu > **Install Command Line Tools**

### Verify installation

```sh
bcomp --help
```

If this prints usage info, you're ready to go.

## Usage

1. Copy two pieces of text (or two files) to your clipboard
2. Open Raycast and run **Compare Clipboard in Beyond Compare**
3. Beyond Compare opens with the diff
