import { Action, ActionPanel, Clipboard, Detail, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { useCallback, useMemo, useRef, useState } from "react";
import { usePromise } from "@raycast/utils";
import { availableStyles, installedVersion, invalidateManifests } from "./lib/manifest";
import { fetchLatestVersion } from "./lib/updates";
import { installStyle } from "./lib/install-style";
import { styleLabel } from "./types";

/**
 * Update installed icon data to the latest upstream release.
 *
 * A **dedicated command** rather than a check on the search command's launch:
 * the grid is opened dozens of times a day and a network round-trip on every
 * one of those is the wrong trade for information that changes at most daily.
 * Checking is now something you ask for.
 */
export default function UpdateIcons() {
  // Keyed on `revision` rather than mounted once: a successful update rewrites
  // both on disk, and reading them only at mount left the body reporting the
  // pre-update version under a toast that said it had just changed.
  const [revision, setRevision] = useState(0);
  const installed = useMemo(() => [...availableStyles()], [revision]);
  const version = useMemo(() => installedVersion(), [revision]);

  const [updating, setUpdating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  // Synchronous re-entrancy guard: a double Enter fires `onAction` twice before
  // `updating` commits, launching two concurrent builds that write the same
  // asset files. A ref blocks the second call; state alone is too slow.
  const inFlight = useRef(false);

  const {
    data: latest,
    isLoading: checking,
    revalidate: recheck,
  } = usePromise(async () => (installed.length > 0 ? fetchLatestVersion(installed[0]) : null), []);

  const outdated = version !== null && latest !== null && latest !== undefined && latest !== version;

  const runUpdate = useCallback(async () => {
    if (inFlight.current || installed.length === 0) return;
    inFlight.current = true;
    setUpdating(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating icon data…" });
    try {
      const before = installedVersion();
      // Reinstall each style through the same runtime path the search command
      // uses — no npm, no clone, so this works on a Store install.
      for (const style of installed) {
        await installStyle(style, (message) => {
          toast.message = `${style} — ${message}`;
        });
      }
      // The rebuild rewrote the manifests on disk, but `loadIndex` memoizes
      // successful reads — without this the "after" read returns the pre-update
      // version and every run reports "already up to date".
      invalidateManifests();
      // Read from disk rather than trusting the command's output, so what's
      // reported is what actually landed.
      const after = installedVersion();
      setRevision((n) => n + 1);

      const upgraded = before !== null && after !== null && before !== after;
      toast.style = Toast.Style.Success;
      if (upgraded) {
        toast.title = `Updated to v${after}`;
        toast.message = `from v${before}`;
        setResult(`# Icon Data Updated\n\nUpdated from \`v${before}\` to \`v${after}\`.`);
      } else {
        toast.title = "Already up to date";
        toast.message = after ? `v${after}` : undefined;
        setResult(
          `# Icon Data Up to Date\n\n${after ? `You're on the latest release (\`v${after}\`).` : "You're on the latest release."}`,
        );
      }
      // Refresh the upstream figure last: `usePromise`'s own toast lifecycle
      // would otherwise clobber the success toast set above.
      recheck();
    } catch (raw) {
      const error = raw as Error & { stdout?: string; stderr?: string };
      const message = (error.stderr || error.stdout || error.message || "Unknown error").trim().slice(0, 500);
      setResult(`# Update Failed\n\n\`\`\`\n${message}\n\`\`\``);
      toast.style = Toast.Style.Failure;
      toast.title = "Update failed";
      toast.message = message;
      toast.primaryAction = { title: "Copy Error", onAction: () => Clipboard.copy(message) };
    } finally {
      inFlight.current = false;
      setUpdating(false);
    }
  }, [installed, recheck]);

  let markdown: string;
  if (installed.length === 0) {
    markdown = [
      "# No Icon Data Installed",
      "",
      "No styles have been installed yet. Open **Search Central Icon System** and pick a style to install it.",
    ].join("\n");
  } else if (updating) {
    markdown = ["# Updating Icon Data…", "", "Fetching the latest release and rebuilding installed styles."].join("\n");
  } else {
    // A completed run leads the body, so the outcome is unmissable on screen
    // and not just a toast that may have already faded.
    const lines = result
      ? [result, ""]
      : ["# Update Icon Data", "", "Rebuild installed styles against the latest `@central-icons-react` release.", ""];

    lines.push(version ? `**Installed:** \`v${version}\`` : "**Installed:** unknown");
    if (checking) lines.push("", "Checking for a newer release…");
    else if (latest)
      lines.push("", outdated ? `**Latest:** \`v${latest}\` — update available` : `**Latest:** \`v${latest}\``);
    else lines.push("", "_Could not reach the npm registry._");

    lines.push("", "**Installed styles**", "");
    for (const style of installed) lines.push(`- ${styleLabel(style)}`);

    markdown = lines.join("\n");
  }

  return (
    <Detail
      isLoading={checking || updating}
      navigationTitle="Update Icon Data"
      markdown={markdown}
      actions={
        <ActionPanel>
          {installed.length > 0 && (
            <Action title={updating ? "Updating…" : "Update Now"} icon={Icon.Download} onAction={runUpdate} />
          )}
          <Action
            title="Check Again"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={recheck}
          />
          <Action.OpenInBrowser title="View Changelog" icon={Icon.Clock} url="https://centralicons.com/changelog" />
        </ActionPanel>
      }
    />
  );
}
