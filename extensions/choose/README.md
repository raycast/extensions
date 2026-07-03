# choose

Yoink of https://github.com/irth/dmenu_raycast, inspired also by https://github.com/chipsenkbeil/choose
This is a rewrite for personal learning purposes.

# Installation

This extension only makes sense in conjunction with https://codeberg.org/SOM38/choose. With go:

```
go install codeberg.org/SOM38/choose@latest
```

Downloading release binary: TBD

# Usage

pipe values separated by "\n" to choose, it will open raycast with
selection, and when you do, its piped back to stdout:

`echo "a\nb\nc" | choose | cat`

