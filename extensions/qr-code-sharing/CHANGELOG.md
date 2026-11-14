# QR Code Sharing Changelog

## [Show Data] - {PR_MERGE_DATE}

- Search Data is now Show Data: it pastes the clipboard into the search bar and shows it at once as text, a QR code or a barcode
- Type to replace the content, and all three views update as you type
- The text view draws one cell per character, colored by kind, for typing a value on another device
- Removed saved entries, editing, pinning and the Export Data command; nothing is stored anymore

## [Initial Version] - 2026-09-28

- Search saved content and see its code next to the list, redrawn as the selection moves
- Create an entry straight from the search bar, with the code previewed before it is saved
- Nine code types: QR Code, Data Matrix, Aztec, PDF417, Code 128, EAN-13, UPC-A, Code 39 and ITF
- Edit content and type with `⌃E`, pin entries to the top with `⌃P`, delete with `⌃X`
- Copy a code as an image or save it to Downloads
- Everything stored in a plain CSV file, with an Export Data command to back it up
