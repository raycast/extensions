#!/usr/bin/env bash
set -euo pipefail

# 把 swift/AudioPlayer.swift 编译成通用二进制（arm64 + x86_64），输出到 assets/audio-player。
# 需要已安装 Xcode 命令行工具（提供 swiftc / lipo）。

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/swift/AudioPlayer.swift"
OUT="$ROOT/assets/audio-player"
BUILD_DIR="$ROOT/.build/audio-player"

mkdir -p "$BUILD_DIR"

# 分别编译两种芯片架构。-O 为优化编译；macos11 是最低系统版本，可按需调整。
swiftc -O -target arm64-apple-macos11  -o "$BUILD_DIR/audio-player-arm64"  "$SRC"
swiftc -O -target x86_64-apple-macos11 -o "$BUILD_DIR/audio-player-x86_64" "$SRC"

# 合并成一个通用二进制。
lipo -create \
  "$BUILD_DIR/audio-player-arm64" \
  "$BUILD_DIR/audio-player-x86_64" \
  -output "$OUT"

chmod +x "$OUT"

echo "✅ Built universal binary at $OUT"
lipo -info "$OUT"

# 记下这次编译所用源码的哈希。CI 会比对它：源码改了却没重新编译，就报错。
shasum -a 256 "$SRC" | awk '{print $1}' > "$SRC.sha256"
echo "✅ Wrote source hash to swift/AudioPlayer.swift.sha256"
