# Downloaded model notices

Model files are downloaded directly from Hugging Face; weights are not bundled with Lens. All four source/conversion repository cards below declare Apache 2.0. A copy of that license is included at [assets/MODEL-LICENSE-APACHE-2.0.txt](assets/MODEL-LICENSE-APACHE-2.0.txt). These declarations and root file inventories were checked on 2026-10-15; none of those inventories supplied a separate LICENSE or NOTICE file.

## EmbeddingGemma 2

Original model: [Google EmbeddingGemma 2](https://huggingface.co/google/embeddinggemma-2). GGUF conversion: [ggml-org/embeddinggemma-2-GGUF](https://huggingface.co/ggml-org/embeddinggemma-2-GGUF/tree/bfcd298762cc34d0357ece5ebdd31791a3a374d8), revision `bfcd298762cc34d0357ece5ebdd31791a3a374d8`.

- `embeddinggemma-2-Q8_0.gguf`: SHA-256 `2188ac1deca4b77dffefd603c2776a9d76d9d74ec01841392982ebb840b09135`.
- `mmproj-embeddinggemma-2-Q8_0.gguf`: SHA-256 `c4a8a52691ecef40618438928bdf9e68379b854e24166f292592353db0aab64f`.

## Qwen3 VL Reranker 2B

Original model: [Qwen/Qwen3-VL-Reranker-2B](https://huggingface.co/Qwen/Qwen3-VL-Reranker-2B). GGUF conversion: [bealore/Qwen3-VL-Reranker-2B-GGUF](https://huggingface.co/bealore/Qwen3-VL-Reranker-2B-GGUF/tree/5dc74c6bf8b65a8b47b1b0e1d6c0cbdba16c7f31), revision `5dc74c6bf8b65a8b47b1b0e1d6c0cbdba16c7f31`.

- `Qwen3-VL-Reranker-2B.Q8_0.gguf`: SHA-256 `c8ec74b99e90cfba08a14753cd8331f6c1711a7723fb1cc560510fe92ad8a340`.
- `Qwen3-VL-Reranker-2B.mmproj-f16.gguf`: SHA-256 `dd03217d1dedaa51bd7cf16313fa9d5e4dda4940c354486bed9b512e802124de`.

Lens modifies the downloaded F16 projector locally by quantizing it to Q8_0 with its pinned llama.cpp runtime. The resulting `Qwen3-VL-Reranker-2B.mmproj-q8_0.gguf` has SHA-256 `f60312ccbe0b2a8ac6c273d90ec739897ae3ab953138ea6652934731be493368`. This is a numerical conversion, not fine-tuning. The original F16 file may be retained for recovery.

The upstream authors' attribution and license declarations are preserved by these links. Lens does not claim authorship of these models or imply endorsement. The extension and native fork are separately MIT-licensed.
