Hackit

> All what a hacker needs.

A powerful Raycast extension providing a suite of cryptographic, encoding, and data processing tools for developers and security enthusiasts.

## Features

### 🔢 Base Converter
Convert numbers between various formats instantly:
- **Formats**: Binary, Octal, Decimal, Hexadecimal, ASCII, Base58, Base64.
- **Smart Detection**: Automatically handles space-separated Hex strings (e.g., `61 62 63`).

### #️⃣ Hash Calculator
Calculate hashes recursively:
- **Algorithms**: MD5, SHA1, SHA256, SHA512.
- **Recursive Hashing**: Hash the result multiple times using `text | N` syntax (e.g., `admin | 5`).

### 🏛️ Caesar Cipher
Encrypt and decrypt using the classic shift cipher:
- **Alphabets**: English (A-Z), English + Digits, Latin (No J, U, W), ASCII Table, Custom.
- **Results**: See both Forward (+N) and Backward (-N) shifts simultaneously.

### 🔄 ROT Cipher
Visualize all 26 rotations of a string at once:
- **Filtering**: Quickly find a specific rotation using `text | N` (e.g., `hello | 13`).

### 🎭 Vigenère Decrypt
Decrypt Vigenère ciphers using a known key.

### ⊕ XOR Calculator
Perform bitwise XOR operations:
- **Inputs**: Auto-detect, Hex, Binary, Decimal, ASCII.
- **Cycling**: Automatically cycles the shorter input to match the longer one.

### 🔒 AES Encryption
Encrypt text using AES-256-CBC:
- User-friendly Form interface.
- Custom Key support (Default: "secret").

### 🔑 PBKDF2 Key Derivation
Derive keys using PBKDF2-SHA256:
- User-friendly Form interface.
- Custom Passphrase, Salt, and Iteration count.

## Installation

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the extension in Raycast.

## License

MIT