# try Changelog

## [0.1.0] - 2025-12-15

- Initial release of **One for All** extension.
- Added **Base** command (`base`):
    - Convert numbers between binary, octal, decimal, hexadecimal, and ASCII.
    - Improved Hex detection (supports space-separated strings).
    - Recursive conversion support (e.g. `text | 5` for 5 rounds).
- Added **Hash** command (`hash`):
    - Support for MD5, SHA1, SHA256, SHA512.
    - Recursive hashing support.
- Added **Decrypt Vigenere** command (`decrypt-vigenere`):
    - Decrypt Vigenère ciphers with a key.
    - Support for Form-based input.
- Added **Clipboard Auto-fill**:
    - Automatically populates input from clipboard for all commands.
- Added **Caesar Cipher** command (`caesar`):
    - Encrypt/Decrypt with Shift N.
    - Support for 5 alphabet types (English, Digits, Latin, ASCII, Custom).
    - Shows both Forward (+N) and Backward (-N) results.
- Added **ROT Cipher** command (`rot`):
    - View all 26 rotations of a string instantly.
    - Support for filtering specific rotation: `text | N` (e.g., `hello | 13`).
- Added **XOR Calculator** command (`xor`):
    - Bitwise XOR of two inputs.
    - Supports Auto, Hex, Binary, Decimal, and ASCII input types.
- Enhanced **Hash** command:
    - Support for recursive hashing (`text | rounds`).
- Added **AES Encryption** command (`aes`):
    - Form-based UI.
    - Encrypt text using AES-256-CBC with custom Key.
- Added **PBKDF2 Key Derivation** command (`pbkdf2`):
    - Form-based UI.
    - Derive keys using PBKDF2-SHA256 with custom Salt and Iterations.