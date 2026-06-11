# WhatsApp Changelog

## [Enhancements] - 2026-05-16
- Type a phone number in Open Chat to open it without saving (also offers to save the contact)
- Added a `Default Country` preference so local phone numbers (e.g. `0530572910`) are accepted alongside international format
- New `Import Chats from Database` command (macOS) to bulk-import individual chats from the local WhatsApp database

## [AI Extension] - 2025-04-05
- Added AI tools: `add-new-whatsapp-chat`, `add-whatsapp-group`, and `open-chat`
- Updated Raycast packages to support AI extensions

## [Enhancements] - 2024-10-01
- "Group Code" when adding a group is now **required**
- "Edit Chat" action in `open-chat` now has a shortcut
- Changed group icon to be `two-people`
- You can now also "Add" from within the `open-chat` command (improvement for https://github.com/raycast/extensions/issues/14456)
- Upgrade dependencies

## [Upgrade dependencies] - 2023-03-12
- Migrate local storage to `@raycast/utils`
- Upgrade `phone` lib to improve phone number validation
- Add alert modal to `Delete Chat` subcommand

## [Added WhatsApp extension] - 2021-12-06
- Initial version code
