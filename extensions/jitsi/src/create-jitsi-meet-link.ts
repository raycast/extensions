import { showHUD, Clipboard, open } from "@raycast/api";

export default async function main() {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const meetingId = `${timestamp}-${randomString}`;

  const jitsiUrl = `https://meet.jit.si/${meetingId}`;

  try {
    await Clipboard.copy(jitsiUrl);

    await open(jitsiUrl);

    await showHUD("Jitsi Meet created and opened! URL copied to clipboard");
  } catch {
    await showHUD("Failed to create Jitsi Meet");
  }
}
