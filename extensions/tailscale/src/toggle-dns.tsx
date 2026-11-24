import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getErrorDetails, InvalidPathError, NotRunningError, tailscaleAsync } from "./shared";

/**
 * Toggles the `Accept DNS` preference (`tailscale get/set --accept-dns`).
 *
 * We intentionally avoid `getStatus()`, `tailscale up/down`, and the
 * `tailscale debug prefs` fallback: `get accept-dns` is a simple, stable,
 * read-only command that works without a debug build. Failures (including
 * old clients that don't support `tailscale get`) surface the underlying
 * CLI error instead of silently toggling the wrong setting.
 */
export default async function ToggleDNS() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Reading Tailscale DNS setting",
    });

    const current = await readAcceptDns();
    const next = current === "true" ? "false" : "true";

    await showToast({
      style: Toast.Style.Animated,
      title: next === "true" ? "Enabling Tailscale DNS" : "Disabling Tailscale DNS",
    });

    await tailscaleAsync(["set", `--accept-dns=${next}`]);

    await showToast({
      style: Toast.Style.Success,
      title: `Tailscale DNS ${next === "true" ? "enabled" : "disabled"}`,
      message: `accept-dns is now ${next}`,
    });
  } catch (err) {
    if (err instanceof InvalidPathError || err instanceof NotRunningError) {
      const details = getErrorDetails(err, "");
      await showFailureToast(details.description, { title: details.title });
    } else {
      // Surface the underlying CLI error (e.g. unsupported command, set
      // failure) so users can see what actually went wrong.
      await showFailureToast(err, { title: "Failed to toggle Tailscale DNS" });
    }
  }
}

/**
 * readAcceptDns reads the current accept-dns preference and returns the
 * strictly trimmed "true" or "false" reported by the CLI. Anything else is
 * refused rather than guessed at.
 */
async function readAcceptDns(): Promise<"true" | "false"> {
  try {
    const { stdout } = await tailscaleAsync(["get", "accept-dns"]);
    const value = stdout.trim();
    if (value !== "true" && value !== "false") {
      throw new Error(`Unexpected output from \`tailscale get accept-dns\`: "${value}"`);
    }
    return value;
  } catch (err) {
    if (err instanceof InvalidPathError || err instanceof NotRunningError) {
      throw err;
    }
    // The `get` command itself failed (e.g. a CLI too old to support it).
    // Wrap the underlying error with an actionable hint.
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      [
        "Could not read the accept-dns setting.",
        "",
        reason,
        "",
        "If your Tailscale CLI is older, it may not support `tailscale get`; updating Tailscale may fix this.",
      ].join("\n"),
    );
  }
}
