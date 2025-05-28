# Chatwork Search Changelog

## [OAuth Enhancements] - 2025-04-16

- Modify scope of OAuth to use "Search Contacts" `command` via OAuth
- Update some packages to eliminate vulnerabilities

## [Enhancements] - 2024-11-19

- _Cache_ "Rooms" with the help of `useCachedPromise`
- Make _OAuth_ more robust with the use of OAuth Util
- Add **Room** icon and accessories
- Add "Search Contacts" `command` (you will need to use an API Token)
- Remove use of `any` for better TS typing

### Dev Notes
- Replace `for` with `map` in Rooms

## [Added Room Search] - 2023-06-22

- Added room search command 

## [Added Chatwork api token support] - 2023-06-18

- Added api token support incase it cannot be authed using PKCE flow 

## [Added Chatwork Search] - 2023-01-18

Initial version code
