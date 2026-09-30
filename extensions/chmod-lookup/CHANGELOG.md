# Chmod Lookup Changelog

## [Initial Version] - 2026-08-07

- Convert numeric (octal) modes to symbolic flags and vice versa
- Support setuid/setgid/sticky bits (`4755` ⇄ `rwsr-xr-x`)
- Support `ls -l` style strings with file type prefix (`drwxr-xr-x`, `lrwxrwxrwx`)
- Support full octal `st_mode` values (`040755`, `120777`)
- Handle partial input (`6` → `rw-`, `r` → `4`)
- Detail panel with per-class breakdown and copy actions
