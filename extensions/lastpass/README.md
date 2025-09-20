# LastPass

Search, view, and copy credentials from LastPass.

## Notes

Since [LastPass ClI](https://github.com/lastpass/lastpass-cli) is not supporting 2FA, this extension can not support it too.
When you have 2FA enabled, this extension will fail with error of wrong password ( that is what returned by LastPass ClI ).

## Prerequisites

- [LastPass ClI](https://github.com/lastpass/lastpass-cli) installed

## Usage

Filter and select credentials, then use

- `Enter` to paste `password`
- `Shift+Enter` to paste `username`
- `Cmd+p` to copy `password` to clipboard
- `Cmd+u` to copy `username` to clipboard
- `Cmd+l` to copy `url` to clipboard
- `Cmd+h` to toggle `Hide Password` feature
