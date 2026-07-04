import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Keyboard,
  Toast,
  showToast,
} from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useCallback, useMemo, useRef, useState } from "react";
import { MissingCliDetail } from "../lib/empty-states";
import {
  resolveYcPath,
  stripAnsi,
  truncate,
  type VersionGate,
} from "../lib/yc";

// `yc -v` prints just the bare version, e.g. "0.0.8".
function parseVersion(stdout: string): string | null {
  const match = stdout.match(/\d+\.\d+\.\d+/);
  return match ? match[0] : null;
}

async function execYc(
  binary: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  return promisify(execFile)(binary, args, {
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
  });
}

// Read the installed version directly via `yc -v` (authoritative), rather than
// scraping `yc update`'s human-readable output.
async function readYcVersion(binary: string): Promise<string | null> {
  const { stdout } = await execYc(binary, ["-v"]);
  return parseVersion(stdout);
}

// `gate` is passed when this screen is reached because the CLI refused to run
// on a too-old version — it lets us explain *why* the user landed here and show
// the minimum required version, rather than a bare "update available" prompt.
// `onRetry` is passed when rendered directly as a command's gate landing (vs.
// pushed): it re-runs the command's own fetch so a successful update drops the
// user back into working state.
export function UpdateYcCli({
  gate,
  onRetry,
}: { gate?: VersionGate; onRetry?: () => void } = {}) {
  const ycPath = resolveYcPath();
  const [updating, setUpdating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  // Synchronous re-entrancy guard: a double Enter can fire onAction twice before
  // the `updating` state commits, which would launch two concurrent `yc update`
  // processes both rewriting the binary in place. A ref blocks the second call.
  const inFlight = useRef(false);

  const {
    data: versionOutput,
    isLoading: checkingVersion,
    revalidate: recheckVersion,
  } = useExec(ycPath ?? "yc", ["-v"], {
    execute: ycPath !== null,
    parseOutput: ({ stdout }) => stdout,
  });

  const currentVersion = useMemo(
    () => (versionOutput ? parseVersion(versionOutput) : null),
    [versionOutput],
  );

  const runUpdate = useCallback(async () => {
    if (!ycPath || inFlight.current) return;
    inFlight.current = true;
    setUpdating(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating YC CLI…",
    });
    try {
      // Capture the version before and after so we report based on what
      // actually changed on disk, not on `yc update`'s output wording.
      const before = await readYcVersion(ycPath);
      await execYc(ycPath, ["update"]);
      const after = await readYcVersion(ycPath);

      // Set our success toast + on-screen result BEFORE revalidating the `yc -v`
      // useExec — that revalidation runs useExec's own toast machinery, which
      // would otherwise clobber this success toast (the bug: no toast appeared).
      const upgraded = before !== null && after !== null && before !== after;
      toast.style = Toast.Style.Success;
      if (upgraded) {
        toast.title = `Updated to ${after}`;
        toast.message = `from ${before}`;
        setResult(
          `# YC CLI Updated\n\nUpdated from \`${before}\` to \`${after}\`.`,
        );
      } else {
        toast.title = "Already up to date";
        toast.message = after ?? undefined;
        setResult(
          [
            "# YC CLI Up to Date",
            "",
            after
              ? `You're on the latest version (\`${after}\`).`
              : "You're on the latest version.",
          ].join("\n"),
        );
      }
      // When this screen is a command's gate landing, offer a one-tap jump back
      // to working state now that the CLI is current.
      if (onRetry) {
        toast.primaryAction = { title: "Reload Command", onAction: onRetry };
      }

      // Refresh the displayed version last, so useExec's toast lifecycle can't
      // race the success toast above.
      recheckVersion();
    } catch (raw) {
      const err = raw as Error & { stdout?: string; stderr?: string };
      const message = truncate(
        stripAnsi(
          err.stderr || err.stdout || err.message || "Unknown error",
        ).trim(),
        500,
      );
      setResult(`# Update Failed\n\n\`\`\`\n${message}\n\`\`\``);
      toast.style = Toast.Style.Failure;
      toast.title = "Update failed";
      toast.message = message;
      toast.primaryAction = {
        title: "Copy Error",
        onAction: () => Clipboard.copy(message),
      };
    } finally {
      inFlight.current = false;
      setUpdating(false);
    }
  }, [ycPath, recheckVersion, onRetry]);

  if (!ycPath) {
    return <MissingCliDetail />;
  }

  // When reached via the version gate, lead with why and show the minimum the
  // CLI demands. Otherwise it's the ordinary "check / update" screen.
  const installed = currentVersion ?? gate?.current ?? null;
  const versionLine = installed
    ? `**Current version:** \`${installed}\``
    : checkingVersion
      ? "Checking the installed version…"
      : "Could not read the installed version.";

  // `yc update` can finish in <200ms when already current, so the toast may
  // flash by. Once a run completes, lead the body with a persistent, prominent
  // result so success/failure is unmissable on-screen — not just a toast.
  let markdown: string;
  if (updating) {
    markdown = ["# Updating YC CLI…", "", "Fetching the latest release."].join(
      "\n",
    );
  } else if (result) {
    markdown = result;
  } else {
    const lines = [
      gate ? "# Update Required" : "# Update YC CLI",
      "",
      gate
        ? "This version of the YC CLI is no longer supported. Update it to keep using the extension."
        : "Run an update to fetch the latest `yc` release. The YC CLI updates itself in place.",
      "",
      versionLine,
    ];
    if (gate?.minimum) lines.push(`**Minimum required:** \`${gate.minimum}\``);
    markdown = lines.join("\n");
  }

  return (
    <Detail
      isLoading={checkingVersion || updating}
      navigationTitle={gate ? "Update Required" : "Update YC CLI"}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title={updating ? "Updating…" : "Update Now"}
            icon={Icon.Download}
            onAction={runUpdate}
          />
          <Action
            title="Recheck Version"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={recheckVersion}
          />
          {onRetry ? (
            <Action
              title="Reload Command"
              icon={Icon.Repeat}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={onRetry}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
