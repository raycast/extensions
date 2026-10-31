# Lens privacy

## Local processing and storage

The native engine reads only configured search roots and maintains local indexes, extracted passages, vectors, thumbnails, ranking caches and explicit search feedback in the extension's support directory. Search subprocesses and model weights run locally. Lens includes no external analytics.

The operating system controls folder access through Raycast's permissions. Removing a folder from search or changing an exclusion does not delete the original files.

## Network activity

Setup downloads pinned model files from Hugging Face and verifies their hashes. Download servers receive ordinary connection information. Model downloads do not upload the files being indexed.

Hosted decisions are optional and disabled by default in this Store candidate. Enabling a provider sends the typed query and decision questions directly to that provider. Provider retention and billing policies apply.

The **Query only** setting sends no candidate file metadata. The optional **Query, filenames and technical metadata** setting additionally permits up to 12 candidate basenames, opaque IDs, extension/type, dimensions, file size, modification date and local relevance scores. Filenames can themselves contain sensitive information; enable this setting only if comfortable sharing them.

File contents, images, previews, OCR text, embeddings and folder paths are never part of hosted decision requests. Local model connections are restricted to loopback addresses. Keys are read from Raycast password preferences, not from the system Keychain by the extension.

## Limitations

This is local storage, not a claim that the index is separately encrypted. macOS account security and disk encryption protect local files according to your system settings. Decision models may be inaccurate. Exclusion review and interpretation corrections are available inside Lens.
