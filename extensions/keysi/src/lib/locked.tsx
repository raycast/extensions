import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import type { TierStatus } from "./tier";

const PRO_MARKDOWN = `# Keysi Pro

Keysi's Raycast commands are part of **Keysi Pro** — a one-time purchase, not a subscription.

Keysi itself is free, with no time limit. Hold ⌘ to see every shortcut of the app you're in, click any row to run it, write your own cheat sheets, search them — none of that costs anything, none of it is affected by this, and anything free today stays free.

What Pro adds is reaching Keysi from *somewhere else*: this extension, Shortcuts, Spotlight actions, and the coaching that notices which shortcuts you keep missing.

Every install includes 14 days of Pro.`;

const NOT_INSTALLED_MARKDOWN = `# Keysi isn't set up yet

This extension couldn't find Keysi on this Mac — or it's installed but hasn't been launched yet.

Install it from [keysi.io](https://keysi.io) and open it once, then come back. Every install includes 14 days of Pro.`;

/**
 * Shown instead of results when the integrations aren't unlocked.
 *
 * Deliberately states no price. The extension has no way to know what Pro
 * costs — it ships and updates on Raycast's schedule, not Keysi's — so a
 * number here is a number that goes stale silently. It already did once,
 * the day the price moved. keysi.io is one click away and is always right.
 *
 * Two different messages on purpose. "You need Pro" is wrong and confusing
 * for someone who simply hasn't run the app — they'd go looking for a
 * purchase they may already own.
 */
export function Locked({ status }: { status: TierStatus }) {
  return (
    <Detail
      markdown={status.known ? PRO_MARKDOWN : NOT_INSTALLED_MARKDOWN}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Keysi.io" url="https://keysi.io" icon={Icon.Globe} />
        </ActionPanel>
      }
    />
  );
}
