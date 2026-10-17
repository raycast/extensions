#!/bin/bash
# Builds llama.cpp (MIT), the embedding runtime: the pinned build tag plus scripts/llama.cpp-no-logits.patch, as static
# libraries combined into Vendor/llama/lib/libllamacpp.a, with the headers in Vendor/llama/include (all out of git).
# Metal shaders are embedded and compiled on first use, so no Metal toolchain is needed. CMake comes from PATH, or from
# a venv in Vendor/ (needs uv). Does nothing when that build is already there; build.sh runs it every time.
set -euo pipefail
cd "$(dirname "$0")/.."
TAG=b11461   # the first tags with EmbeddingGemma 2 (text + vision + audio) are b11452+
# A new TAG ships only if `swift test` passes: ReferenceVectorTests checks it makes the same vectors, so every index is
# kept. If it fails, keep this TAG, or bump LlamaEmbedder.vectorVersion and write the reference vectors again
# (DIGUP_WRITE_REFERENCE=1 swift test --filter ReferenceVectorTests): every index then embeds again.
PATCH=scripts/llama.cpp-no-logits.patch
SOURCE=Vendor/llama.cpp
OUT=Vendor/llama
STAMP="$TAG $(shasum -a 256 "$PATCH" | cut -c1-12)"
if [[ -z "${DEVELOPER_DIR:-}" && -d /Applications/Xcode.app ]]; then
  export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
fi

if [[ ! -d "$SOURCE" ]]; then
  git -c advice.detachedHead=false clone --quiet --depth 1 --branch "$TAG" https://github.com/ggml-org/llama.cpp "$SOURCE"
elif [[ "$(git -C "$SOURCE" describe --tags --exact-match 2>/dev/null)" != "$TAG" ]]; then
  git -C "$SOURCE" fetch --quiet --depth 1 origin tag "$TAG"
  git -C "$SOURCE" checkout --quiet --force "$TAG"   # --force also drops the old patch
fi
# Without the patch, every input token costs 1 MiB of logits that an embedding model never produces (262k vocabulary).
/bin/bash scripts/check-llama-patch.sh "$SOURCE" "$PWD/$PATCH"
# Trust a cached library only after proving its source still contains the required patch.
if [[ -f "$OUT/lib/libllamacpp.a" && "$(cat "$OUT/BUILD" 2>/dev/null)" == "$STAMP" ]]; then
  exit 0
fi

if ! command -v cmake > /dev/null; then
  if [[ ! -x Vendor/cmake-venv/bin/cmake ]]; then
    uv venv --quiet Vendor/cmake-venv --python 3.12
    uv pip install --quiet --python Vendor/cmake-venv/bin/python cmake ninja
  fi
  export PATH="$PWD/Vendor/cmake-venv/bin:$PATH"
fi
GENERATOR=$(command -v ninja > /dev/null && echo Ninja || echo "Unix Makefiles")
# Only the libraries: no tools, no server, nothing downloaded at build time.
cmake -S "$SOURCE" -B Vendor/llama-build -G "$GENERATOR" -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_DEPLOYMENT_TARGET=14.0 \
  -DBUILD_SHARED_LIBS=OFF -DGGML_METAL=ON -DGGML_METAL_EMBED_LIBRARY=ON -DGGML_NATIVE=OFF -DLLAMA_BUILD_MTMD=ON \
  -DLLAMA_BUILD_COMMON=OFF -DLLAMA_BUILD_TOOLS=OFF -DLLAMA_BUILD_SERVER=OFF -DLLAMA_BUILD_EXAMPLES=OFF \
  -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_APP=OFF -DLLAMA_BUILD_UI=OFF -DLLAMA_OPENSSL=OFF > /dev/null
# Limit compiler concurrency so building does not saturate the user's Mac.
BUILD_JOBS=2
cmake --build Vendor/llama-build --config Release -j "$BUILD_JOBS" --target llama mtmd > /dev/null

B=Vendor/llama-build
mkdir -p "$OUT/lib" "$OUT/include"
xcrun libtool -static -no_warning_for_no_symbols -o "$OUT/lib/libllamacpp.a" \
  $B/src/libllama.a $B/tools/mtmd/libmtmd.a $B/ggml/src/libggml.a $B/ggml/src/libggml-base.a \
  $B/ggml/src/libggml-cpu.a $B/ggml/src/ggml-metal/libggml-metal.a $B/ggml/src/ggml-blas/libggml-blas.a \
  $B/vendor/hash/libvendor-hash.a
cp "$SOURCE/include/llama.h" "$SOURCE"/ggml/include/*.h "$SOURCE/tools/mtmd/mtmd.h" "$SOURCE/tools/mtmd/mtmd-helper.h" \
  "$OUT/include/"
# The build, for logs and `digup status` (indexes record LlamaEmbedder.vectorVersion, not this). SwiftPM doesn't see a
# changed header, so the Swift file that reads it is touched.
printf '// Written by scripts/build-llama.sh.\n#define LLAMA_BUILD_TAG "%s"\n' "$TAG" > "$OUT/include/llama-build.h"
touch Sources/LlamaRuntime/LlamaEmbedder.swift
echo "$STAMP" > "$OUT/BUILD"
echo "Built llama.cpp $TAG (patched) into $OUT"
