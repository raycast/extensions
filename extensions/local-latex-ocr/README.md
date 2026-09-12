# Local LaTeX OCR

Capture a printed equation anywhere on your Mac and convert it to LaTeX without sending the image to a server.

## Commands

- **Capture Math** returns raw LaTeX.
- **Capture Math as Markdown** wraps the result in `$...$`.
- **Capture Display Math** wraps the result in a `$$...$$` block.
- **Review Last Capture** lets you inspect, edit, copy, paste, recapture, or discard the latest uncertain result.

Assign global hotkeys to the three capture commands in Raycast Settings → Extensions.

## First Run

The first capture downloads approximately 330 MiB of Apache-2.0 TexTeller3 ONNX model files from a pinned Hugging Face revision. Each file is pinned by size and SHA-256 and stored in Raycast's extension support directory. Downloads are written atomically; an incomplete or modified artifact is never loaded.

macOS will ask Raycast for Screen & System Audio Recording permission when screen capture is first used. Local LaTeX OCR officially supports Apple Silicon Macs in v1.

## Privacy

- Captured images and inference stay on the Mac.
- With **Copy to Clipboard** enabled, every completed capture is copied, including results routed to review for low confidence or syntax issues.
- There are no API keys, remote inference calls, analytics, LaunchAgents, or login items.
- Network access is only needed to download a versioned model that is not already installed.
- A temporary worker keeps the model warm for ten minutes after use and then exits. Its short Unix socket lives in a per-user 0700 directory under `/tmp`; model state and logs remain in Raycast support storage.
- Successful and discarded captures are deleted immediately; abandoned capture files are removed after 24 hours.

## Model and Runtime

Recognition uses [TexTeller3](https://huggingface.co/onnx-community/TexTeller3-ONNX) with quantized FP16-weight ONNX graphs. The encoder runs once per capture and the decoder uses the model's `decoder_with_past` KV cache. A warm-up request starts model sessions while the user selects the screen region, so first-use model load is normally hidden behind the selection gesture. On Apple Silicon, the worker selects ONNX Runtime's native arm64 CPU backend; Core ML and local WebAssembly remain automatic fallbacks.

The runtime copied into the extension is trimmed to the macOS arm64 binding and one shared library; Linux, Windows, and Intel artifacts from the npm package are excluded. The model weights still download separately on first use.

## Development

```bash
npm install
npm test
npm run lint
npm run build
```

`npm run build:worker` builds the auditable TypeScript worker and copies the exact ONNX Runtime WASM files from the pinned npm dependency into runtime assets. Model weights are never copied into `assets/` or the Store archive.

## Accuracy and Performance Gate

The repository includes a deterministic 150-formula development corpus and a benchmark/calibration runner. It requires a local TeX installation and ImageMagick only for generating test images; neither is a user/runtime dependency.

```bash
npm run corpus:generate
npm run benchmark -- --model-dir /path/to/verified/model/directory
```

Use `--backend cpu`, `--backend coreml`, or `--backend wasm` to compare execution providers. `auto` selects native arm64 CPU first on Apple Silicon.

The runner writes `benchmarks/latest.md` plus inspectable per-example JSON. Do not use the synthetic corpus alone for Store performance or accuracy claims: the release gate also requires a manually sourced paper/PDF/web corpus and app-level QA on the baseline M1.

The checked-in [Apple Silicon performance notes](benchmarks/performance.md) record the TexTeller3 runtime tuning and the latest synthetic-corpus measurements. Current native warm p50 is about 1.1 seconds; this is an engineering measurement, not a sub-second Store claim.

The [model candidate review](benchmarks/model-candidates.md) records the TexTeller3 model choice, artifact revision, and remaining M-series accuracy/performance validation work.
