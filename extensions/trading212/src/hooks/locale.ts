import { execFileSync } from "node:child_process";
import { appleLocaleToBcp47, setNumberLocale } from "../lib/format";

/**
 * Numbers follow the Mac's region (System Settings → General → Language & Region). Raycast's Node
 * runtime defaults to en-US, so the region is read from macOS once when a command starts.
 */
function readAppleLocale(): string {
  try {
    return execFileSync("/usr/bin/defaults", ["read", "-g", "AppleLocale"], { encoding: "utf8", timeout: 1000 });
  } catch {
    return "";
  }
}

const tag = appleLocaleToBcp47(readAppleLocale());
if (tag) setNumberLocale(tag);
