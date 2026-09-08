import { Action, ActionPanel, Clipboard, Detail, Icon, showToast, Toast } from "@raycast/api";
import { diagnosticReport } from "../utils/diagnostics";
import { useEffect } from "react";
import { logGranolaError } from "../utils/errorUtils";

interface UnresponsiveProps {
  context?: string;
  error?: Error;
}

export default function Unresponsive({ context = "unknown", error }: UnresponsiveProps) {
  useEffect(() => {
    logGranolaError("Unresponsive screen shown", error ?? new Error("Granola service unreachable"), { context });
  }, [context, error]);

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action
            title="Copy Diagnostics"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(await diagnosticReport());
              await showToast({ style: Toast.Style.Success, title: "Diagnostics Copied" });
            }}
          />
        </ActionPanel>
      }
      markdown={`# Could Not Load Granola\n\n${error?.message ?? "Check your internet connection and try again. If your session was revoked, sign out in Raycast extension preferences and reconnect."}`}
    />
  );
}
