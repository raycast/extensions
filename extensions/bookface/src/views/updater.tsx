import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Toast,
  showToast,
} from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useCallback, useMemo, useRef, useState } from "react";
import { MissingCliDetail } from "../lib/empty-states";
import { resolveYcPath, truncate } from "../lib/yc";

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

export function UpdateYcCli() {
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
      recheckVersion();

      const upgraded = before !== null && after !== null && before !== after;
      toast.style = Toast.Style.Success;
      if (upgraded) {
        toast.title = `Updated to ${after}`;
        setResult(`Updated YC CLI from \`${before}\` to \`${after}\`.`);
      } else {
        toast.title = "Already up to date";
        setResult(
          after
            ? `YC CLI is already up to date (\`${after}\`).`
            : "YC CLI is already up to date.",
        );
      }
    } catch (raw) {
      const err = raw as Error & { stdout?: string; stderr?: string };
      const message = truncate(
        (err.stderr || err.stdout || err.message || "Unknown error").trim(),
        500,
      );
      setResult(`Update failed:\n\n\`\`\`\n${message}\n\`\`\``);
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
  }, [ycPath, recheckVersion]);

  if (!ycPath) {
    return <MissingCliDetail />;
  }

  const markdown = [
    "# Update YC CLI",
    "",
    currentVersion
      ? `**Current version:** \`${currentVersion}\``
      : checkingVersion
        ? "Checking the installed version…"
        : "Could not read the installed version.",
    "",
    "Run an update to fetch the latest `yc` release. The CLI updates itself in place.",
    result ? `\n---\n\n${result}` : "",
  ].join("\n");

  return (
    <Detail
      isLoading={checkingVersion || updating}
      navigationTitle="Update YC CLI"
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
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={recheckVersion}
          />
        </ActionPanel>
      }
    />
  );
}
