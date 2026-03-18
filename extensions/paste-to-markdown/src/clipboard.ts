import { spawnSync } from "node:child_process";

export function readPasteboardType(type: string): Buffer | null {
  const script = [
    'ObjC.import("AppKit");',
    `var data = $.NSPasteboard.generalPasteboard.dataForType("${type}");`,
    'data.isNil() ? "nil" : ObjC.unwrap(data.base64EncodedStringWithOptions(0));',
  ].join("\n");

  const result = spawnSync("osascript", ["-l", "JavaScript", "-e", script], {
    encoding: "utf8",
    timeout: 2000,
  });

  const out = result.stdout.trim();
  if (!out || out === "nil") return null;
  return Buffer.from(out, "base64");
}
