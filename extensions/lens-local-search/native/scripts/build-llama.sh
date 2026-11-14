#!/bin/bash
# Builds llama.cpp (MIT), the embedding runtime: the pinned build tag plus scripts/llama.cpp-no-logits.patch, as static
# libraries combined into Vendor/llama/lib/libllamacpp.a, with the headers in Vendor/llama/include (all out of git).
# Metal shaders are embedded and compiled on first use, so no Metal toolchain is needed. CMake comes from PATH, or from
# a venv in Vendor/ (needs uv). Does nothing when that build is already there; build.sh runs it every time.
# On Linux and Windows it builds shared libraries instead, with ggml's backends as modules loaded at run
# time (GGML_BACKEND_DL): the CPU variants always, CUDA when nvcc is found (CUDACXX, or on PATH; CUDA_ARCHS picks the GPU
# architectures, default native), else Vulkan when its SDK is. On Windows it runs in Git for Windows' bash
# inside the MSVC environment (vcvars64) and
# leaves DLLs with their import libraries.
set -euo pipefail
cd "$(dirname "$0")/.."
TAG=b11461   # the first tags with EmbeddingGemma 2 (text + vision + audio) are b11452+
COMMIT=4d756bc72bf00a4aacf410ae15a2d315f3db400d   # TAG's commit: a tag can be moved, a commit can't
# A new TAG ships only if `swift test` passes: ReferenceVectorTests checks it makes the same vectors, so every index is
# kept. If it fails, keep this TAG, or bump LlamaEmbedder.vectorVersion and write the reference vectors again
# (DIGUP_WRITE_REFERENCE=1 swift test --filter ReferenceVectorTests): every index then embeds again.
PATCH=scripts/llama.cpp-no-logits.patch
SOURCE=Vendor/llama.cpp
BUILD=Vendor/llama-build
OUT=Vendor/llama
OS=$(uname -s)
if [[ $OS == Darwin ]]; then
  FLAVOR=metal
elif command -v "${CUDACXX:-nvcc}" > /dev/null; then
  FLAVOR=cuda
elif command -v glslc > /dev/null; then
  FLAVOR=vulkan
else
  FLAVOR=cpu
fi
STAMP="$TAG $(shasum -a 256 "$PATCH" 2>/dev/null | cut -c1-12 || sha256sum "$PATCH" | cut -c1-12) $FLAVOR lens-release-prefix-v1"
if [[ -z "${DEVELOPER_DIR:-}" && -d /Applications/Xcode.app ]]; then
  export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
fi

if [[ ! -d "$SOURCE" ]]; then
  # Line endings as they are (Git for Windows would turn them into CRLF, and the patch wouldn't apply).
  git -c advice.detachedHead=false -c core.autocrlf=false clone --quiet --depth 1 --branch "$TAG" \
    https://github.com/ggml-org/llama.cpp "$SOURCE"
fi
if [[ "$(git -C "$SOURCE" rev-parse HEAD)" != "$COMMIT" ]]; then
  echo "llama.cpp's $TAG isn't commit $COMMIT here: not building it" >&2
  exit 1
fi
# Without the patch, every input token costs 1 MiB of logits that an embedding model never produces (262k vocabulary).
if git -C "$SOURCE" apply --check "../../$PATCH" 2>/dev/null; then
  git -C "$SOURCE" apply "../../$PATCH"
fi

if [[ ( -f "$OUT/lib/libllamacpp.a" || -f "$OUT/lib/libllama.so" || -f "$OUT/lib/llama.dll" ) \
      && "$(cat "$OUT/BUILD" 2>/dev/null)" == "$STAMP" ]]; then
  exit 0
fi

if ! command -v cmake > /dev/null; then
  if [[ ! -x Vendor/cmake-venv/bin/cmake ]]; then
    uv venv --quiet Vendor/cmake-venv --python 3.12
    uv pip install --quiet --python Vendor/cmake-venv/bin/python cmake==4.4.4 ninja==1.13.2
  fi
  export PATH="$PWD/Vendor/cmake-venv/bin:$PATH"
fi
if [[ $OS == Darwin ]]; then
  GENERATOR=$(command -v ninja > /dev/null && echo Ninja || echo "Unix Makefiles")
  # Only the libraries: no tools, no server, nothing downloaded at build time.
  cmake -S "$SOURCE" -B "$BUILD" -G "$GENERATOR" -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_DEPLOYMENT_TARGET=14.0 \
    "-DCMAKE_C_FLAGS=-ffile-prefix-map=$PWD=/usr/src/lens" \
    "-DCMAKE_CXX_FLAGS=-ffile-prefix-map=$PWD=/usr/src/lens" \
    -DBUILD_SHARED_LIBS=OFF -DGGML_METAL=ON -DGGML_METAL_EMBED_LIBRARY=ON -DGGML_NATIVE=OFF -DLLAMA_BUILD_MTMD=ON \
    -DLLAMA_BUILD_COMMON=OFF -DLLAMA_BUILD_TOOLS=OFF -DLLAMA_BUILD_SERVER=OFF -DLLAMA_BUILD_EXAMPLES=OFF \
    -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_APP=OFF -DLLAMA_BUILD_UI=OFF -DLLAMA_OPENSSL=OFF > /dev/null
  cmake --build "$BUILD" --config Release -j 2 --target llama mtmd > /dev/null

  B="$BUILD"
  mkdir -p "$OUT/lib" "$OUT/include"
  xcrun libtool -static -no_warning_for_no_symbols -o "$OUT/lib/libllamacpp.a" \
    $B/src/libllama.a $B/tools/mtmd/libmtmd.a $B/ggml/src/libggml.a $B/ggml/src/libggml-base.a \
    $B/ggml/src/libggml-cpu.a $B/ggml/src/ggml-metal/libggml-metal.a $B/ggml/src/ggml-blas/libggml-blas.a \
    $B/vendor/hash/libvendor-hash.a
else
  GENERATOR=$(command -v ninja > /dev/null && echo Ninja || echo "Unix Makefiles")
  if [[ $OS == MINGW* || $OS == MSYS* ]]; then
    export CC=cl CXX=cl   # MSVC, not whatever else bash finds first
  fi
  case $FLAVOR in
    cuda) GPU=(-DGGML_CUDA=ON "-DCMAKE_CUDA_ARCHITECTURES=${CUDA_ARCHS:-native}") ;;
    vulkan) GPU=(-DGGML_VULKAN=ON) ;;
    *) GPU=() ;;
  esac
  # Shared libraries, the backends as modules (every CPU variant, so one build fits any x86-64 or arm64 machine).
  cmake -S "$SOURCE" -B "$BUILD" -G "$GENERATOR" -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_SHARED_LIBS=ON -DGGML_BACKEND_DL=ON -DGGML_CPU_ALL_VARIANTS=ON -DGGML_NATIVE=OFF "${GPU[@]}" \
    -DLLAMA_BUILD_MTMD=ON -DLLAMA_BUILD_COMMON=OFF -DLLAMA_BUILD_TOOLS=OFF -DLLAMA_BUILD_SERVER=OFF \
    -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_APP=OFF -DLLAMA_BUILD_UI=OFF -DLLAMA_OPENSSL=OFF \
    -DLLAMA_CURL=OFF > /dev/null
  cmake --build "$BUILD" --config Release -j "$(nproc)" > /dev/null
  rm -rf "$OUT/lib" && mkdir -p "$OUT/lib" "$OUT/include"
  if [[ $OS == MINGW* || $OS == MSYS* ]]; then
    # The DLLs (the backends among them), and the import libraries the helper links against.
    cp "$BUILD"/bin/*.dll "$OUT/lib/"
    find "$BUILD" \( -name llama.lib -o -name mtmd.lib -o -name ggml.lib -o -name ggml-base.lib \) \
      -exec cp {} "$OUT/lib/" \;
  else
    # The libraries with their versioned names (the SONAMEs the helper links against) and the symlinks to them.
    cp -a "$BUILD"/bin/*.so* "$OUT/lib/"
  fi
fi
cp "$SOURCE/include/llama.h" "$SOURCE"/ggml/include/*.h "$SOURCE/tools/mtmd/mtmd.h" "$SOURCE/tools/mtmd/mtmd-helper.h" \
  "$OUT/include/"
# The build, for logs and `digup status` (indexes record LlamaEmbedder.vectorVersion, not this). SwiftPM doesn't see a
# changed header, so the Swift file that reads it is touched.
printf '// Written by scripts/build-llama.sh.\n#define LLAMA_BUILD_TAG "%s"\n' "$TAG" > "$OUT/include/llama-build.h"
touch Sources/LlamaRuntime/LlamaEmbedder.swift
echo "$STAMP" > "$OUT/BUILD"
echo "Built llama.cpp $TAG (patched, $FLAVOR) into $OUT"
