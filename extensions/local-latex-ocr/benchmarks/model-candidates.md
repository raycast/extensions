# LaTeX OCR Model Candidate Review

This review is for the Apple Silicon local-runtime target. Numbers from upstream
are not directly comparable to this extension's M-series benchmark unless the
same image corpus and runtime are used.

| Candidate            | Evidence                                                                                                                  | Size / license                | Apple Silicon decision                                                                                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TexTeller3 ONNX      | Trained on the newer 80M-pair TexTeller dataset; the ONNX export documents a `decoder_with_past_model.onnx` KV-cache path | 330 MiB installed, Apache-2.0 | Selected v1 model. The pinned q4f16 encoder/decoder/past graphs and tokenizer are now in the downloader manifest; M-series benchmark and 50-fixture parity remain release gates. [`TexTeller3-ONNX`](https://huggingface.co/onnx-community/TexTeller3-ONNX)                            |
| PP-FormulaNet_plus-S | Official Paddle benchmark reports 88.71 En-BLEU and 179.20 ms GPU / 260.99 ms CPU model inference                         | 248 MB, Apache-2.0 upstream   | Promising accuracy/size trade-off, but the official artifact is Paddle-oriented and the reported latency is not a <50 ms Apple target. [`PaddleOCR formula recognition`](https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/pipeline_usage/formula_recognition.en.md) |
| UniMERNet-Tiny       | Trained/evaluated on UniMER-1M and UniMER-Test, with a real-world focus                                                   | 441 MB, Apache-2.0            | Accuracy candidate, but official deployment is Python/Paddle and the pipeline is too large for a fast Raycast command. [`UniMERNet`](https://github.com/opendatalab/UniMERNet)                                                                                                         |
| Texo                 | Small 20M-parameter browser model with an ONNX export                                                                     | 20 MB, AGPL-3.0               | Technically attractive for latency, but incompatible with the extension's Store-friendly MIT distribution target. [`Texo`](https://github.com/alephpi/Texo)                                                                                                                            |

## Decision

TexTeller3 q4f16 is the only model shipped by this extension. Its cached
decoder keeps each generated token to a single decoder step while retaining
an Apache-2.0 model license. Do not claim or gate on `<50 ms` yet. Screenshot
capture, PNG decoding, and Raycast IPC are also part of end-to-end latency.

Remaining validation checks:

1. Pin every model file by revision, size, and SHA-256.
2. Inspect the encoder/decoder I/O names and cache tensor shapes.
3. Implement greedy KV-cache decoding and tokenizer parity.
4. Compare at least 50 shared fixtures against the Python reference.
5. Benchmark native CPU, Core ML, and WebAssembly on the same M-series machine.
