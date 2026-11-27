import { showToast, Toast } from "@raycast/api";
import { ChildProcess, execFile } from "child_process";

// Raycast runs extensions without PATH, so say is called by its absolute path.
const SAY = "/usr/bin/say";
// Tingting ships with macOS; any other Mandarin (China mainland) voice is used if it's missing.
const PREFERRED_VOICE = "Tingting";
// say can't go below ~50 wpm for this voice; at 50, Tingting speaks about 1.8x slower than its default.
const SLOW_RATE = 50;
// Pressing Speak again on the same text within this window repeats it slowly.
const REPEAT_WINDOW_MS = 10_000;

let current: ChildProcess | undefined;
let last: { text: string; at: number } | undefined;
let voice: Promise<string | undefined> | undefined;

// `say -v ?` lists one voice per line: "Tingting            zh_CN    # 你好！我叫婷婷。"
const findVoice = () =>
  new Promise<string | undefined>((resolve) => {
    execFile(SAY, ["-v", "?"], (error, stdout) => {
      const voices = error
        ? []
        : stdout.split("\n").flatMap((line) => {
            const match = line.match(/^(.+?)\s+(zh_CN)\s+#/);
            return match ? [match[1]] : [];
          });
      resolve(voices.find((name) => name === PREFERRED_VOICE) ?? voices[0]);
    });
  });

const fail = (message: string) => showToast({ style: Toast.Style.Failure, title: "Couldn't Speak", message });

export async function speak(text: string) {
  const now = Date.now();
  const slow = last?.text === text && now - last.at < REPEAT_WINDOW_MS;
  last = { text, at: now };

  voice ??= findVoice();
  const name = await voice;
  current?.kill();
  if (!name) {
    voice = undefined; // look again next time, in case one was just added
    fail("Add a Chinese voice in System Settings → Accessibility → Spoken Content → System Voice → Manage Voices");
    return;
  }
  const args = ["-v", name, ...(slow ? ["-r", String(SLOW_RATE)] : []), text];
  const child = execFile(SAY, args, { timeout: 30_000 }, (error) => {
    if (error && current === child) fail(error.message);
  });
  current = child;
}
