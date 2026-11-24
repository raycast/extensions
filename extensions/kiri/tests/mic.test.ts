import { describe, expect, it } from "vitest";
import { isSystemDaemon, parseMicPids, parsePs } from "../src/lib/mic";

// Shape of `pmset -g assertions` on macOS (taken from a real Mac, ids shortened).
const IDLE = `Listed by owning process:
   pid 15115(Music): [0x0030594100018ad3] 635:03:07 PreventUserIdleSystemSleep named: "com.apple.Music.common"
   pid 615(coreaudiod): [0x0049ee7600019408] 00:00:03 PreventUserIdleSystemSleep named: "com.apple.audio.AudioTap-6593E99C.context.preventuseridlesleep"
	Created for PID: 1113.
	Resources: audio-in 0959BA4A-9CE3-4B39-BD93-F62F95C8099E
   pid 615(coreaudiod): [0x0049ee7600019ad2] 00:00:03 PreventUserIdleSystemSleep named: "com.apple.audio.BuiltInSpeakerDevice.context.preventuseridlesleep"
	Created for PID: 60261.
	Resources: audio-out BuiltInSpeakerDevice
No kernel assertions.`;

const CALL = IDLE.replace(
  "No kernel assertions.",
  `   pid 615(coreaudiod): [0x0049ee7600019ad9] 00:00:41 PreventUserIdleSystemSleep named: "com.apple.audio.BuiltInMicrophoneDevice.context.preventuseridlesleep"
	Created for PID: 4242.
	Resources: audio-in BuiltInMicrophoneDevice
No kernel assertions.`,
);

describe("microphone check", () => {
  it("ignores speakers and audio taps (Hey Siri)", () => {
    expect(parseMicPids(IDLE)).toEqual([]);
  });

  it("finds the app recording from the microphone", () => {
    expect(parseMicPids(CALL)).toEqual([4242]);
  });

  it("only trusts coreaudiod's own assertions", () => {
    const fake = `   pid 99(SomeApp): [0x1] 00:00:01 PreventUserIdleSystemSleep named: "x"
	Created for PID: 77.
	Resources: audio-in BuiltInMicrophoneDevice`;
    expect(parseMicPids(fake)).toEqual([]);
  });

  it("tells macOS daemons from apps", () => {
    expect(isSystemDaemon("/System/Library/PrivateFrameworks/CoreSpeech.framework/corespeechd")).toBe(true);
    expect(isSystemDaemon("/usr/libexec/something")).toBe(true);
    expect(isSystemDaemon("/System/Applications/FaceTime.app/Contents/MacOS/FaceTime")).toBe(false);
    expect(isSystemDaemon("/Applications/zoom.us.app/Contents/MacOS/zoom.us")).toBe(false);
  });

  it("reads ps output, including paths with spaces", () => {
    const m = parsePs(" 4242 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome\n  77 /usr/sbin/x\n");
    expect(m.get(4242)).toBe("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
    expect(m.get(77)).toBe("/usr/sbin/x");
  });
});
