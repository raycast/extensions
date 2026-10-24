# TexTeller3 Apple Silicon Runtime Notes

These are development measurements from the pinned TexTeller3 q4f16 ONNX
artifacts, not Store marketing claims. The direct-engine probe used a captured
688×144 equation on this Apple Silicon machine and five warm recognitions.

| Configuration                            | Session load |   Warm runs | Backend |
| ---------------------------------------- | -----------: | ----------: | ------- |
| Native CPU, 6 intra-op threads, arena on |    0.8–1.0 s | 1.07–1.18 s | `cpu`   |
| Native CPU, 4 intra-op threads, arena on |        0.8 s | 1.30–1.37 s | `cpu`   |

The 150-image synthetic corpus run measured warm p50 **1,097 ms**, warm p95
**1,631 ms**, and cold load plus first inference **3,115 ms**. Its peak RSS was
**1,701 MiB**, above the original 750 MiB gate because ONNX Runtime expands the
quantized graphs into sizeable CPU execution buffers. This is now recorded as a
release risk rather than hidden by an earlier benchmark configuration.

The worker now keeps all three ONNX sessions in memory, reuses the token
tensors, precomputes KV-cache bindings, and starts warming the model before the
screen-selection gesture. Decodes are capped at 128 tokens and abort a
12-token repetition loop, routing malformed crops to review instead of
burning several extra seconds. The default native thread count is six and can be
overridden with `LOCAL_LATEX_OCR_NATIVE_THREADS`; `LOCAL_LATEX_OCR_CPU_ARENA=0`
is available for debugging memory behavior.

The remaining latency is the TexTeller3 autoregressive decoder itself. Core ML
was attempted, but this q4f16 export falls back to native CPU on the tested
machine, so no Core ML speedup is claimed. A <50 ms target is not realistic for
this 330 MiB encoder-decoder model without a different hardware-specific export.
