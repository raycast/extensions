import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export type MediaKey = "play" | "next" | "previous" | "forward" | "rewind";

export const MEDIA_KEY_CODES: Record<MediaKey, number> = {
  play: 16,
  next: 17,
  previous: 18,
  forward: 19,
  rewind: 20,
};

export const SCRIPT = `function run(argv) {
  ObjC.import("Cocoa");
  ObjC.import("CoreGraphics");
  ObjC.import("ApplicationServices");
  if (!$.AXIsProcessTrusted()) {
    throw new Error("not-trusted");
  }
  const code = parseInt(argv[0], 10);
  for (const flags of [0xA00, 0xB00]) {
    const ev = $.NSEvent.otherEventWithTypeLocationModifierFlagsTimestampWindowNumberContextSubtypeData1Data2(14, $.NSMakePoint(0,0), flags, 0, 0, $(), 8, (code<<16)|flags, -1);
    $.CGEventPost($.kCGHIDEventTap, ev.CGEvent);
    if (flags === 0xA00) {
      delay(0.001);
    }
  }
}`;

export const sendMediaKey = async (key: MediaKey): Promise<void> => {
  try {
    await exec("osascript", ["-l", "JavaScript", "-e", SCRIPT, String(MEDIA_KEY_CODES[key])]);
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr ?? "";
    if (stderr.includes("not-trusted")) {
      throw new Error("Raycast needs Accessibility access: System Settings → Privacy & Security → Accessibility");
    }
    throw new Error(stderr.trim() || `failed to send media key: ${key}`);
  }
};
