import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

export default function Onboarding() {
  const markdown = `
  # Configuration

  This extension reads text aloud using a local TTS server. It auto-detects [tts-gateway](https://github.com/abpai/tts-gateway) servers and streams from \`/tts/stream/pcm\` when \`ffplay\` is available, then falls back to buffered \`/v1/speech\` playback when streaming is unavailable. Any server that accepts \`POST /tts\` with a \`text\` form field also works.

  **Recommended: tts-gateway**
  1. Install: \`uv tool install tts-gateway[kokoro]\`
  2. Start the server: \`tts serve --provider kokoro\`
  3. Press \`⏎\` to open preferences and confirm the server URL (default: \`http://localhost:8000\`).

  **Using another TTS server**
  1. Start your TTS server.
  2. Press \`⏎\` to open preferences.
  3. Set the "Server URL" to your server's endpoint.

  **Optional: ffmpeg**

  Install \`ffmpeg\` to enable playback speed adjustment and audio format conversion. Without it, audio plays at the original speed and format returned by the server.

  Install \`ffplay\` to enable low-latency tts-gateway streaming for normal-speed playback.

  **Playback controls**

  Add a hotkey for **Stop Audio** if you want quick control after speech starts.
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
