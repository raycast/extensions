import { Action, ActionPanel, Clipboard, Detail, Icon, showToast, Toast, environment } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import getAccessToken from "./utils/getAccessToken";
import { checkEndpoints, EndpointCheck } from "./utils/checkEndpoints";
import { diagnosticReport } from "./utils/diagnostics";

// Available even when signed out: users must be able to retrieve diagnostics
// when the failure is in sign-in itself.
export default function Command() {
  const [checks, setChecks] = useState<EndpointCheck[]>([]);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState("Not run");
  const controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => controller.current?.abort(), []);
  async function run(verifyRefresh = false) {
    if (controller.current) return;
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    try {
      if (verifyRefresh) {
        await getAccessToken(true);
        setRefresh("Passed: refreshed session saved in Raycast");
      }
      setChecks(await checkEndpoints(current.signal));
    } catch (error) {
      if (verifyRefresh) setRefresh("Failed; see diagnostics");
      if (!current.signal.aborted)
        await showToast({
          style: Toast.Style.Failure,
          title: "Connection Check Failed",
          message: error instanceof Error ? error.message : "Please try again",
        });
    } finally {
      controller.current = undefined;
      setBusy(false);
    }
  }
  const markdown = `# Granola Connection\n\nRefresh: ${refresh}\n\n${checks.length ? "| Endpoint | Result | Detail |\n|---|---|---|\n" + checks.map((c) => `| ${c.path} | ${c.result} | ${c.detail} |`).join("\n") : "Check your sign-in and read endpoints. Your notes and folders will not be modified. Generation and write endpoints are listed separately and are not called."}\n\nDiagnostics include request status, timing, and reference IDs. They exclude credentials, request/response bodies, and meeting content.`;
  return (
    <Detail
      isLoading={busy}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Check Read Endpoints" icon={Icon.Network} onAction={() => run()} />
          <Action
            title="Verify Token Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => run(true)}
          />
          <Action
            title="Copy Diagnostics"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(
                `Granola diagnostics\nPlatform: ${process.platform}\nCommand: ${environment.commandName}\n\n${markdown}\n\n${await diagnosticReport()}`,
              );
              await showToast({ style: Toast.Style.Success, title: "Diagnostics Copied" });
            }}
          />
          {busy && <Action title="Cancel Check" icon={Icon.XMarkCircle} onAction={() => controller.current?.abort()} />}
        </ActionPanel>
      }
    />
  );
}
