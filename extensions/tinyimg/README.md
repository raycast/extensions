# TinyIMG

This project was inspired by TinyPNG, it doesn't require an API key. All compression happens locally, with no restrictions whatsoever.

## Commands

| name                       | description               |
| -------------------------- | ------------------------- |
| `Compress Selected Images` | Compress selected images. |

## Binary

The compression capability is provided by the open-source project [Libcaesium WASM](https://github.com/Lymphatus/libcaesium-wasm). I've compiled it into WebAssembly (WASM) code to run in Node.js.
