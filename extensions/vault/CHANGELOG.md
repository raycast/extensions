# Vault Changelog

## [Fix] - 2023-12-18

- Fix copy token issue with OIDC login

## [Login With OIDC] - 2023-11-03

- Add OIDC login via vault, this becomes the default login method, but can still be changed in preferences

## [Fix] - 2023-05-26

- Update dependencies
- Fix issue when wrong namespace was set and could not change it afterward 

## [Secret Engine Selection] - 2023-05-24

- Add possibility to select secret engine (via action 'List Engines' or directly in preferences)

## [Export Env] - 2023-05-16

- Add export to env format

## [Fix] - 2023-05-03

- Fix issue to reuse vault token from cache

## [Added Vault] - 2023-03-01

- Login with token or ldap/password and auto-renewal of token
- List secrets keys and search
- Display secret
    - with/without details
    - list / json mode
    - copy secret value(s)
    - save to file
- Create new secret version
- Delete/undelete/destroy secret
- Open link in UI
- Copy token
- Change namespace
- Switch to favorite namespaces

## [Update Dependencies] - 2022-08-27

- Update dependencies
- Update scripts
- Add changelog

## [Add Vault Extension] - 2021-11-11

- Add initial version of the Vault extension
