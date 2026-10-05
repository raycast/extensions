// 把 raycast/swift/SyncHelper.swift 编译成 assets/goose-2fa-helper。
// 放在 `ray build` 之前跑：helper 必须已经存在，ray 才会把它打进扩展的 assets 目录。
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(extensionRoot, "swift", "SyncHelper.swift");
const output = path.join(extensionRoot, "assets", "goose-2fa-helper");

if (process.platform !== "darwin") {
  console.error("Swift helper 只在 macOS 编译（当前平台：" + process.platform + "）");
  process.exit(1);
}

mkdirSync(path.dirname(output), { recursive: true });
execFileSync(
  "swiftc",
  ["-O", "-o", output, source, "-framework", "Vision", "-framework", "AppKit"],
  { stdio: "inherit" },
);
chmodSync(output, 0o755);

const size = statSync(output).size;
console.log(`✓ Swift helper → ${path.relative(extensionRoot, output)} (${size} bytes)`);
