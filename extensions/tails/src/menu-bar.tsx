import {
  Clipboard,
  Color,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { fetchUsage, handleApiError } from "./lib/api";
import { isUrl } from "./lib/format";
import { getPreferences } from "./lib/preferences";

export default function TailsMenuBar() {
  const { data: usage, isLoading } = useCachedPromise(fetchUsage, [], {
    onError: handleApiError,
  });

  const pct = usage ? Math.round((usage.used / usage.quota) * 100) : 0;
  const icon = usage
    ? pct >= 90
      ? { source: "extension-icon.png", tintColor: Color.Red }
      : pct >= 70
        ? { source: "extension-icon.png", tintColor: Color.Orange }
        : "extension-icon.png"
    : "extension-icon.png";

  const title = usage ? `${usage.used}/${usage.quota}` : "…";
  const tooltip = usage
    ? `Tails — ${usage.used} of ${usage.quota} credits used (${pct}%)`
    : "Tails — Loading…";

  return (
    <MenuBarExtra
      icon={icon}
      title={title}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="Usage">
        {usage && (
          <>
            <MenuBarExtra.Item
              title={`${usageBar(pct)}  ${usage.used} / ${usage.quota}`}
            />
            <MenuBarExtra.Item
              title={`Resets ${formatResetShort(usage.resetsAt)}`}
            />
          </>
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Quick Actions">
        <MenuBarExtra.Item
          title="Download from Clipboard"
          icon={Icon.Clipboard}
          onAction={downloadFromClipboard}
        />
        <MenuBarExtra.Item
          title="Download History"
          icon={Icon.List}
          onAction={() =>
            launchCommand({
              name: "download-history",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          title="Open Tails Dashboard"
          icon={Icon.Globe}
          onAction={() => open(getPreferences().instanceUrl)}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Separator />

      <MenuBarExtra.Item
        title="Download Media…"
        icon={Icon.Download}
        onAction={() =>
          launchCommand({
            name: "download-media",
            type: LaunchType.UserInitiated,
          })
        }
      />
    </MenuBarExtra>
  );
}

async function downloadFromClipboard() {
  try {
    const text = await Clipboard.readText();
    if (!text) {
      await showHUD("Clipboard is empty");
      return;
    }

    const url = text.trim();

    if (!isUrl(url)) {
      await showHUD("Clipboard doesn't contain a link");
      return;
    }

    await launchCommand({
      name: "quick-download",
      type: LaunchType.UserInitiated,
      arguments: { url },
    });
  } catch (error) {
    await handleApiError(error);
  }
}

function formatResetShort(iso: string): string {
  if (iso === "never") return "never (trial)";

  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "tomorrow";
  return `in ${diffDays} days`;
}

function usageBar(pct: number): string {
  const filled = Math.round(pct / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}
