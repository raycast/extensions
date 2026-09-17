# Chmod Lookup

Convert between numeric (octal) and symbolic Unix permission notation, in both directions.

## Usage

Open the **Look up Chmod Mode** command and type a mode — or type `chmod <mode>` straight into Raycast root search (the value fills the command's argument). A leading `chmod ` in the input is ignored, so pasting a full command works too.

| Input        | Result       | Notes                                |
| ------------ | ------------ | ------------------------------------ |
| `770`        | `rwxrwx---`  | numeric → symbolic                   |
| `rwxrwx---`  | `770`        | symbolic → numeric                   |
| `4755`       | `rwsr-xr-x`  | setuid / setgid / sticky bits        |
| `drwxr-xr-x` | `755`        | `ls -l` style with file type prefix  |
| `120777`     | `lrwxrwxrwx` | full octal `st_mode` incl. file type |
| `6`          | `rw-`        | single digit                         |
| `r`          | `4`          | partial flags                        |

Supported file type prefixes: `-` (file), `d` (directory), `l` (symlink), `b`, `c`, `p`, `s`.

The detail panel breaks the mode down per class (owner / group / others), shows special bits, the full octal `st_mode`, and the ready-to-copy `chmod` command.
