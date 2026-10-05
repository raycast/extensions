import { Action, ActionPanel, Detail, Icon, Keyboard, open, showToast, Toast } from "@raycast/api";
import { showLicenseSettings } from "./keysi";
import type { TierStatus } from "./tier";

const PRO_MARKDOWN = `# Keysi Pro

Keysi's Raycast commands are part of **Keysi Pro** — a one-time purchase, not a subscription.

Keysi itself is free, with no time limit. Hold ⌘ to see every shortcut of the app you're in, click any row to run it, write your own cheat sheets, search them — none of that costs anything, none of it is affected by this, and anything free today stays free.

What Pro adds is reaching Keysi from *somewhere else*: this extension, Shortcuts, Spotlight actions, and the coaching that notices which shortcuts you keep missing.

Every install includes 14 days of Pro.

*Already bought it?* Open Keysi's License settings below and paste your key, then press ⌘R here.`;

const NOT_INSTALLED_MARKDOWN = `# Keysi isn't set up yet

This extension couldn't find Keysi on this Mac — or it's installed but hasn't been launched yet.

Install it from [keysi.io](https://keysi.io) and open it once, then come back and press ⌘R. Every install includes 14 days of Pro.`;

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
 *
 * Neither message says "your trial ran out", even though a lapsed trial is
 * the most likely way to get here. The same state is reached by a refunded
 * or revoked license, and telling a paying customer their trial expired is
 * the one wrong thing this screen could say. `Entitlements` makes the same
 * point about every string on Keysi's own side.
 */
export function Locked({ status, onRecheck }: { status: TierStatus; onRecheck?: () => void }) {
  return (
    <Detail
      markdown={status.known ? PRO_MARKDOWN : NOT_INSTALLED_MARKDOWN}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Keysi.io" url="https://keysi.io" icon={Icon.Globe} />
          {/*
            Only offered when Keysi has demonstrably run on this Mac.
            Otherwise this opens nothing and reports that Keysi isn't
            installed — which the screen above has already said.
          */}
          {status.known ? (
            <Action title="Open Keysi's License Settings" icon={Icon.Key} onAction={() => showLicenseSettings()} />
          ) : null}
          {/*
            Raycast keeps a command alive after it loses focus, so without
            this, buying Pro in the window that this screen just sent the
            user to leaves them staring at the locked state with no way
            forward but quitting Raycast.
          */}
          {onRecheck ? (
            <Action
              title="Check Again"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRecheck}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

/**
 * The same refusal, for the commands that have no view to put it in.
 *
 * Keysi refuses these over `keysi://` too, and opens its License settings
 * when it does — so this is not the lock, it is the explanation. Without it
 * the only feedback would be Keysi's Settings window appearing for no
 * stated reason.
 */
export async function showLockedToast(status: TierStatus): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: status.known ? "Keysi Pro required" : "Keysi isn't set up yet",
    message: status.known
      ? "Raycast commands are part of Keysi Pro, a one-time purchase. Keysi itself stays free."
      : "Install Keysi from keysi.io and open it once.",
    primaryAction: status.known
      ? {
          title: "Open License Settings",
          onAction: () => {
            void showLicenseSettings();
          },
        }
      : {
          title: "Open keysi.io",
          onAction: () => {
            void open("https://keysi.io");
          },
        },
  });
}
