# Changelog

## [Store-ready TexTeller3 runtime] - {PR_MERGE_DATE}

- Fixed stale-worker races that could spawn duplicate workers, hit socket errors, and add an 8-second fallback delay.
- Moved the worker socket to a short per-user `/tmp` path to avoid macOS AF_UNIX pathname truncation under Raycast's long support directory.
- Bumped the worker protocol so an older installed worker is replaced automatically.
- Bumped the protocol again for the warm-up request and early termination of pathological repeated-token decodes.
- HUD now reports total capture time separately from model inference time.
- Switched the default model to the pinned TexTeller3 q4f16 ONNX export with KV-cache decoding.
- Removed the previous OCR model path; TexTeller3 is now the sole inference backend.
- Added model warm-up during region selection, reusable decoder tensors, precomputed cache bindings, and tuned six-thread Apple Silicon CPU sessions.
- Completed TexTeller preprocessing, tokenizer cleanup, display-delimiter normalization, and immediate clipboard copy for reviewed results.

## [Initial Release] - {PR_MERGE_DATE}

- Capture printed equations as raw, inline Markdown, or display Markdown LaTeX.
- Run TexTeller3 locally with verified model downloads and a temporary warm worker.
- Review and edit uncertain results before copying or pasting.
- Prefer a trimmed native Apple Silicon inference runtime, with Core ML and WASM fallbacks.
- Add per-backend performance benchmarks and a refined professional extension icon.
