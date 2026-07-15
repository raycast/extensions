# yopass Changelog

## [Update dependency version] - 2026-02-02

- Downgrade `openpgp` from 6.1.1 to 5.11.3 (5.11.3 does _not_ have vulnerability and 6.1.1 does _not_ work in Raycast properly) (fixes extension not working (ref: [Issue #25058](https://github.com/raycast/extensions/issues/25058)))
- Show `Toast` during encryption

## [Update dependency version] - 2025-05-23

- Update openpgp library version to 6.1.1, due to a vulnerability report on version below 5.11.3

## [Add Yopass Extension] - 2022-08-26

- Add initial version of the Yopass extension, to encrypt messages via Yopass
