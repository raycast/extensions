# Native helper

Dig Up uses a small Apple Silicon executable for macOS APIs: image decoding and resizing, PDF text and rendering, Vision OCR, audio/video extraction, Quick Look thumbnails, and power state. It receives JSON lines from the extension and returns JSON.

All source is included in `helper/*.swift`. Rebuild on macOS 14 or later with Xcode Command Line Tools:

```sh
npm run build:helper
```

The script invokes the system Swift compiler with an explicit arm64 macOS 14 target and system frameworks. It applies an ad-hoc signature; no developer identity or certificate is embedded. The binary is not downloaded from an author-controlled endpoint. The Store build uses the bundled helper so CI does not need Xcode. Reviewers can rebuild it directly from the source.

`assets/daemon.js` is a generated JavaScript bundle of `engine/daemon.ts`; `npm run build` regenerates it with esbuild. The model and llama.cpp are fetched only by explicit setup from pinned Hugging Face and ggml-org releases. Sizes and SHA-256 hashes are recorded in `engine/install.ts`.

The helper and port retain DigUp's MIT attribution in `LICENSE` and `assets/DIGUP-LICENSE.txt`.
