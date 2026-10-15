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

export const KEY_DOWN_FLAGS = 0x0a00;
export const KEY_UP_FLAGS = 0x0b00;

const FLAGS_OFFSET = 0x44;
const DATA1_OFFSET = 0x74;

// A serialised system-defined NSEvent (subtype 8, the media key shape), as CGEventCreateFromData reads it.
const EVENT_TEMPLATE_BASE64 =
  "AAAAAgABQDUAAAAAAAFANgAAAAAAAUA3AAAADgACwDgAAAAARJIgAAACwDkAAAAARJIgAAABADoAAAAAAAAAAAABQDsAAAoAAAFAMwAAAAAAAUA0AAAAAAABQGoAAAAAAAFAawAAAAAAAUBTAAAACAAPQFQAWgoA/////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export const expectedData1 = (code: number, flags: number): number => ((code << 16) | flags) >>> 0;

export const buildEventBlob = (code: number, flags: number): string => {
  const bytes = Buffer.from(EVENT_TEMPLATE_BASE64, "base64");
  bytes.writeUInt32BE(flags, FLAGS_OFFSET);
  bytes.writeUInt32BE(expectedData1(code, flags), DATA1_OFFSET);
  return bytes.toString("base64");
};

// Kept as source so the same function runs in JXA and is unit-tested. JXA values are boxed, hence Number().
export const GUARD_SOURCE = `function isExpectedMediaKeyEvent(type, subtype, data1, flags, expectedData1) {
  return (
    Number(type) === 14 &&
    Number(subtype) === 8 &&
    Number(data1) === Number(expectedData1) &&
    Number(flags) === (Number(expectedData1) & 0xffff)
  );
}`;

export const SCRIPT = `${GUARD_SOURCE}
function run(argv) {
  ObjC.import("Cocoa");
  ObjC.import("CoreGraphics");
  ObjC.import("ApplicationServices");
  if (!$.AXIsProcessTrusted()) {
    throw new Error("not-trusted");
  }
  const presses = [
    { blob: argv[0], expected: argv[2] },
    { blob: argv[1], expected: argv[3] },
  ];
  presses.forEach((press, index) => {
    const data = $.NSData.alloc.initWithBase64EncodedStringOptions(press.blob, 0);
    const event = $.CGEventCreateFromData(null, data);
    const ns = $.NSEvent.eventWithCGEvent(event);
    if (!isExpectedMediaKeyEvent($.CGEventGetType(event), ns.subtype, ns.data1, $.CGEventGetFlags(event), press.expected)) {
      throw new Error("unexpected-event-format");
    }
    $.CGEventPost($.kCGHIDEventTap, event);
    if (index === 0) {
      delay(0.001);
    }
  });
  // CGEventPost is asynchronous: exiting straight away can drop the key-up.
  delay(0.05);
}`;

export const buildScriptArgs = (code: number): string[] => [
  buildEventBlob(code, KEY_DOWN_FLAGS),
  buildEventBlob(code, KEY_UP_FLAGS),
  String(expectedData1(code, KEY_DOWN_FLAGS)),
  String(expectedData1(code, KEY_UP_FLAGS)),
];

export const sendMediaKey = async (key: MediaKey): Promise<void> => {
  try {
    await exec("osascript", ["-l", "JavaScript", "-e", SCRIPT, ...buildScriptArgs(MEDIA_KEY_CODES[key])]);
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr ?? "";
    if (stderr.includes("not-trusted")) {
      throw new Error("Raycast needs Accessibility access: System Settings → Privacy & Security → Accessibility");
    }
    throw new Error(stderr.trim() || `failed to send media key: ${key}`);
  }
};
