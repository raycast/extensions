# TinyIMG

This project was inspired by TinyPNG, it doesn't require an API key. All compression happens locally, with no restrictions whatsoever.

## Commands

| name                       | description               |
| -------------------------- | ------------------------- |
| `Compress Selected Images` | Compress selected images. |

## Binary

The compression capability is provided by the following open-source projects:

- [Libcaesium WASM](https://github.com/Lymphatus/libcaesium-wasm): Provides general image compression (JPG, PNG, WebP).
- [apngopt-rs](https://github.com/wuyax/apngopt-rs): Provides specialized APNG (Animated PNG) optimization.

All libraries are compiled into WebAssembly (WASM) to run locally in Node.js.
