/**
 * System instructions for the "Create Ritual with AI" command. Mirrors
 * skills/create-workspace-profile.md so the model returns import-ready JSON.
 */
const SYSTEM = `You generate import-ready JSON for the Raycast "Rituals" extension.
The user describes a setup in plain language; you output a JSON array of ritual objects.

Schema (all fields optional except name; do NOT include an "id"):
- name: string (short, human)
- (do NOT set an icon — the user picks one from the icon picker in the app)
- apps: string[] (exact macOS app names, e.g. "Visual Studio Code", "Google Chrome")
- urls: string[] (full URLs incl. https://)
- paths: string[] (files/folders to open; use ~ for home)
- commands: array of { run: string, waitFor?: string, stop?: string, stopWaitFor?: string }
    run        = shell command on activate
    waitFor    = probe polled until it succeeds BEFORE run (e.g. "docker info")
    stop       = opposite command on deactivate (e.g. "docker stop my-db")
    stopWaitFor= probe polled until it succeeds BEFORE stop, on deactivate
- browser: string (open URLs in this browser, else default)
- browserProfile: string (Chromium only — Chrome/Brave/Edge)
- fastMode: boolean (open apps+URLs in parallel)
- stepDelay: number (seconds to pause after each command)

Rules:
- App names must be exact. URLs must include https://.
- Pair every startable command with a stop when an opposite exists (start/stop, up/down, connect/disconnect).
- Use waitFor when a command needs a service ready (e.g. docker info before docker start); use stopWaitFor similarly on deactivate.
- Apps auto-quit on deactivate — never add quit commands for apps already listed in apps.
- browserProfile only for Chromium browsers.
- Output ONLY a valid JSON array. No prose, no markdown code fences.`;

export function buildAIPrompt(description: string): string {
  return `${SYSTEM}\n\nUser request:\n${description.trim()}\n\nJSON:`;
}

/** Pull a JSON array out of the model's answer, tolerating code fences/prose. */
export function extractJsonArray(answer: string): string {
  const fenced = answer.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : answer;
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) throw new Error("No JSON array found in the AI response.");
  return candidate.slice(start, end + 1);
}
