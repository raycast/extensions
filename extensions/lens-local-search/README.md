# Lens

Search files on your Mac by meaning. Find a photo from a description, a PDF from its contents, or a passage inside a text file. Lens runs its search engine locally and does not require a separate app.

## Requirements and setup

- Apple Silicon Mac running macOS 14 or later. Intel Macs and Windows are not supported by this build.
- Choose **Choose Search Folders**, select the folders to include, then **Save and Index**. macOS may ask you to allow Raycast to access those folders.
- The embedding models download once from Hugging Face: about 865 MB. For optional local content ranking, use **Download Local Ranking Model (2.66 GB)** in the Actions menu of **Choose Search Folders**. Setup shows download/conversion status and errors. Closing the view stops setup; reopening it and retrying resumes the download. Allow extra disk space for conversion and the index.
- Initial indexing can take time on large libraries. Search covers the files processed so far; having selected a folder does not mean its contents are fully indexed.

## Search

Open **Search Files by Meaning** and describe what you need. Use the scope menu to narrow the search to images, documents or code. Explicit filename constraints are applied locally. PDF and text results can show the matching page or passage; arrow keys move between results and Return opens the selected file.

Results appear before optional local content ranking finishes. This second stage reads a small shortlist on your Mac and may reorder results. It can take several seconds and briefly use several GB of RAM. Disable **Local Content Ranking** in command preferences if you prefer lighter searches.

## Automatic updates and exclusions

Raycast schedules **Update Search Index** every five minutes while running. This is periodic, not instant. Indexing pauses for power, thermal conditions and recent foreground searches, and resumes on later runs. You can also run the command manually.

Lens skips common build output, dependencies and confidently identified copied project trees. **Review Automatic Exclusions** lets you inspect or restore automatically excluded folders. Exclusions change the index; they never delete your files. Modified or uncertain copies receive separate treatment rather than being blindly discarded.

## Optional decision models

Search works without an API key. Hosted decisions are **off by default**. To enable them, select SubQ, Jev or OpenAI Decisions in command preferences and enter the corresponding API key. Provider charges and availability apply. A compatible loopback model server is also supported through **Local Model**.

The default sharing setting is **Query only**. If you explicitly select **Query, filenames and technical metadata**, up to 12 candidate basenames and technical fields can also be sent for ranking. File contents, photos, previews, OCR, embeddings, folder paths and the index stay on this Mac. API keys use Raycast password preferences. See [PRIVACY.md](PRIVACY.md) for the data boundary.

A decision model can misunderstand a query or become unavailable. Lens shows its interpretation when available and offers **Adjust Interpretation**. Search quality depends on model support, extraction quality and indexing progress; scanned, protected or malformed documents may have limited searchable text.

## Open source

Lens's engine derives from [DigUp](https://github.com/ARahim3/DigUp) under the MIT license and uses [llama.cpp](https://github.com/ggml-org/llama.cpp). The original app is not required. The exact engine source and build recipe are included in [native/BUILD.md](native/BUILD.md). Original copyright and third-party notices are retained in [LICENSE](LICENSE) and [assets/Acknowledgements.txt](assets/Acknowledgements.txt).

Models are downloaded separately, pinned and checksum-verified: [EmbeddingGemma 2 GGUF](https://huggingface.co/ggml-org/embeddinggemma-2-GGUF) and [Qwen3-VL-Reranker-2B GGUF](https://huggingface.co/bealore/Qwen3-VL-Reranker-2B-GGUF), whose repositories list Apache 2.0 licenses. Model licenses are separate from this extension's MIT license. See [MODEL-NOTICES.md](MODEL-NOTICES.md) for the pinned artifacts and license text.
