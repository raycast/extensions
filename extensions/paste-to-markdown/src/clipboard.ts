import { spawnSync } from "node:child_process";

const script = [
  'ObjC.import("AppKit");',
  "var args = $.NSProcessInfo.processInfo.arguments;",
  "var type = ObjC.unwrap(args.objectAtIndex(args.count - 1));",
  "var data = $.NSPasteboard.generalPasteboard.dataForType(type);",
  'data.isNil() ? "nil" : ObjC.unwrap(data.base64EncodedStringWithOptions(0));',
].join("\n");

export function readPasteboardType(type: string): Buffer | null {
  const result = spawnSync("osascript", ["-l", "JavaScript", "-e", script, "--", type], {
    encoding: "utf8",
    timeout: 2000,
  });

  const out = result.stdout.trim();
  if (!out || out === "nil") return null;
  return Buffer.from(out, "base64");
}
