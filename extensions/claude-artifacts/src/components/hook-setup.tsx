import { Action, ActionPanel, Color, Detail, Icon, Keyboard, List } from "@raycast/api";

import { GalleryActionSection } from "../actions/gallery";
import { RevealInFinderAction } from "../actions/reveal-in-finder";
import { HOOK_SNIPPET, SETTINGS_PATHS, SETUP_DOCS_URL, SETUP_PROMPT } from "../utils/hook-status";

/**
 * `Detail` markdown, so the fix can be explained rather than merely copied.
 *
 * The manual steps stay on the page instead of behind the README link: the
 * person reading this has already discovered that tracking is broken, and
 * sending them to a browser to find out what to do about it is a worse
 * handoff than showing them here.
 */
const SETUP_MARKDOWN = `# Turn On Artifact Tracking

Claude Code tracks every artifact you publish in a local index at \`~/.claude/artifacts.json\`. Nothing is writing to that file right now, so **new artifacts will not appear in this list** — including any you have published since it stopped.

## Let Claude Code do it

Press **⏎** to copy a setup prompt, then paste it into any Claude Code session.

It installs the recorder, registers it without disturbing hooks you already have, and verifies the result. It also shows you the script before installing it, so you can read what will run on your machine.

## Or do it by hand

**1. Install the recorder**

\`\`\`bash
mkdir -p ~/.claude/hooks
curl -fsSL -o ~/.claude/hooks/record-artifact.sh \\
  https://raw.githubusercontent.com/chrismessina/raycast-claude-artifacts/main/scripts/record-artifact.sh
chmod +x ~/.claude/hooks/record-artifact.sh
\`\`\`

**2. Register it** in \`~/.claude/settings.json\` under \`hooks.PostToolUse\`. If that array already exists, **append** to it — do not replace it:

\`\`\`json
${HOOK_SNIPPET}
\`\`\`

**3. Check that it took**

\`\`\`bash
jq '[.hooks.PostToolUse[] | select(.hooks[]?.command | (test("artifact";"i") and (test("probe-artifact-hook\\\\.sh";"i") | not)))] | length' ~/.claude/settings.json
\`\`\`

\`0\` means tracking is still off.

---

Registration only takes effect in a **new** Claude Code session — restart it before publishing a test artifact, or the install will look like it failed.

Requires \`jq\` and \`perl\`. If either is missing the hook exits quietly rather than failing your Claude Code turn.`;

export function HookSetupDetail() {
  return (
    <Detail
      navigationTitle="Set Up Artifact Tracking"
      markdown={SETUP_MARKDOWN}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Setup Prompt"
            icon={Icon.Clipboard}
            content={SETUP_PROMPT}
            // Deliberately the FIRST action, so ⏎ copies the thing that
            // actually fixes the problem. The raw JSON below is the fallback.
          />
          <Action.CopyToClipboard
            title="Copy Hook Configuration"
            icon={Icon.Code}
            content={HOOK_SNIPPET}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.OpenInBrowser title="View Setup Instructions" icon={Icon.Book} url={SETUP_DOCS_URL} />
          <RevealInFinderAction title="Show Settings File" path={SETTINGS_PATHS[0]} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Shown at the top of the list when no artifact-tracking hook is registered.
 *
 * A row rather than a toast, deliberately. A toast is an event notification and
 * this is a persistent condition: it would auto-dismiss, fire on every launch,
 * and — worst — leave the stale list looking authoritative once it faded. The
 * list itself is the thing that is lying, so the correction belongs in the list.
 *
 * This exists because the failure is otherwise INVISIBLE. When the hook stops
 * running, the index simply stops growing, and a list of real artifacts that is
 * quietly frozen is indistinguishable from a list that is merely up to date.
 * Observed 2026-08-24: a third-party integration rewrote `hooks.PostToolUse`
 * and dropped the entry; 44 publishes went unrecorded over a month before
 * anyone noticed, and the extension reported nothing wrong the entire time.
 */
export function HookNotRegisteredItem() {
  return (
    <List.Item
      icon={{ source: Icon.Warning, tintColor: Color.Orange }}
      title="Artifact Tracking Is Off"
      subtitle="New Artifacts aren't being tracked"
      accessories={[{ tag: { value: "Setup Tracking", color: Color.Orange } }]}
      actions={
        <ActionPanel>
          {/*
            Opens the explanation rather than copying JSON. A bare config
            fragment on the clipboard leaves the user holding something with no
            obvious destination — it is not a whole file, and it names a script
            they may not have yet.

            Primary here, unlike in `NotInstalledEmptyView`: this row is new, so
            there is no prior default action to preserve.
          */}
          <Action.Push title="Set Up Artifact Tracking" icon={Icon.Plug} target={<HookSetupDetail />} />
          <Action.CopyToClipboard
            title="Copy Setup Prompt"
            icon={Icon.Clipboard}
            content={SETUP_PROMPT}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <RevealInFinderAction title="Show Settings File" path={SETTINGS_PATHS[0]} />
          <GalleryActionSection />
        </ActionPanel>
      }
    />
  );
}
