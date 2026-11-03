import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { Extension, unreviewed } from "../lib/model";
import { extensionMarkdown } from "../lib/report";
import { openSettings } from "../lib/navigation/open-settings";
import { Audit } from "./use-audit";
import { storeListing } from "../lib/navigation/store-listing";
import { exportReport, ReportFormat } from "../lib/export";

async function exportAudit(audit: Audit, format: ReportFormat) {
  try {
    const file = await exportReport(audit.state, format);
    await showToast({ style: Toast.Style.Success, title: "Audit report exported", message: file });
    await showInFinder(file);
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Could not export report", message: String(error) });
  }
}

export function AuditActions({
  audit,
  extension,
  children,
}: {
  audit: Audit;
  extension?: Extension;
  children?: React.ReactNode;
}) {
  const events = audit.state.events.filter((e) => !extension || e.extensionKey === extension.key);
  const listing = extension && storeListing(extension);
  return (
    <ActionPanel>
      {children}
      {extension && (
        <ActionPanel.Section>
          <Action title="Open Browser Extension Settings" icon={Icon.Globe} onAction={() => openSettings(extension)} />
          {listing && <Action.OpenInBrowser title={listing.title} url={listing.url} />}
          <Action.CopyToClipboard
            title="Copy Extension ID"
            content={extension.id}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard title="Copy Findings" content={extensionMarkdown(extension, events)} />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        {unreviewed(events).length > 0 && (
          <Action
            title={extension ? "Mark Extension Changes as Reviewed" : "Mark All Changes as Reviewed"}
            icon={Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
            onAction={() => audit.review(unreviewed(events).map((e) => e.id))}
          />
        )}
        <Action
          title="Scan Again"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={audit.refresh}
        />
        <Action
          title="Export Report as Markdown"
          icon={Icon.Download}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          onAction={() => exportAudit(audit, "md")}
        />
        <Action title="Export Report as JSON" icon={Icon.Code} onAction={() => exportAudit(audit, "json")} />
        <Action
          title="Activate Menu Bar Monitoring"
          icon={Icon.Shield}
          onAction={() => launchCommand({ name: "extension-changes", type: LaunchType.UserInitiated })}
        />
        <Action
          title="Reset Baseline"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={async () => {
            if (
              await confirmAlert({
                title: "Reset audit baseline and history?",
                message:
                  "Current review history will be replaced by a new baseline. The previous audit is saved locally for recovery. Browser configuration is not modified.",
                primaryAction: { title: "Reset Baseline", style: Alert.ActionStyle.Destructive },
              })
            )
              await audit.reset();
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
