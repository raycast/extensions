import {
  Action,
  ActionPanel,
  List,
  Icon,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  LocalStorage,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getAuditEntries, clearAudit, getThreatFeeds } from "./storage";
import { AuditEntry, ThreatFeed } from "./types";

export default function Settings() {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [threatFeeds, setThreatFeeds] = useState<ThreatFeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [entries, feeds] = await Promise.all([
        getAuditEntries(),
        getThreatFeeds(),
      ]);
      setAuditEntries(entries);
      setThreatFeeds(feeds);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleClearAudit = async () => {
    const confirmed = await confirmAlert({
      title: "Clear Audit Log",
      message:
        "This will permanently delete all audit entries. This action cannot be undone.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await clearAudit();
      setAuditEntries([]);
      showToast(Toast.Style.Success, "Audit log cleared");
    }
  };

  const handleResetAllData = async () => {
    const confirmed = await confirmAlert({
      title: "Reset All Local Data",
      message:
        "This will permanently delete all local data including the audit log and threat feeds. This action cannot be undone.",
      primaryAction: {
        title: "Reset All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await LocalStorage.clear();
      setAuditEntries([]);
      setThreatFeeds([]);
      showToast(Toast.Style.Success, "All local data cleared");
    }
  };

  const launchFeeds = () => {
    launchCommand({
      name: "feeds",
      type: LaunchType.UserInitiated,
    });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const auditBytes = auditEntries.reduce(
    (sum, entry) => sum + JSON.stringify(entry).length,
    0
  );

  const packageJsonContent = `{
  "name": "secure-redact",
  "version": "1.0.0",
  "description": "100% offline data redaction for sensitive information"
}`;

  const version = JSON.parse(packageJsonContent).version;

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle="Settings">
      <List.Section title="Data">
        <List.Item
          title="Audit Log"
          subtitle={`${auditEntries.length} entries • ${formatBytes(
            auditBytes
          )} used`}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Audit Log Statistics"
                    text="Local redaction history"
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Total Entries"
                    text={auditEntries.length.toString()}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Storage Used"
                    text={formatBytes(auditBytes)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Max Entries"
                    text="500"
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Storage Location"
                    text="LocalStorage key: secure-redact.audit.v1"
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Clear Audit Log"
                onAction={handleClearAudit}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Threat Feeds"
          subtitle={`${threatFeeds.length} feeds`}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Custom Threat Feeds"
                    text="User-defined detection patterns"
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Total Feeds"
                    text={threatFeeds.length.toString()}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Enabled Feeds"
                    text={threatFeeds
                      .filter((f) => f.enabled)
                      .length.toString()}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Storage Location"
                    text="LocalStorage key: secure-redact.feeds.v1"
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Open Feeds Manager"
                onAction={launchFeeds}
                icon={Icon.ArrowRight}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Reset All Local Data"
          subtitle="Clear audit and feeds"
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Complete Reset"
                    text="Permanently delete all stored data"
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Will Delete"
                    text="• Complete audit history\n• All custom threat feeds\n• All preferences and settings"
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Storage Keys Cleared"
                    text="• secure-redact.audit.v1\n• secure-redact.feeds.v1"
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Reset All Data"
                onAction={handleResetAllData}
                icon={Icon.ExclamationMark}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="About">
        <List.Item
          title="Version"
          accessories={[{ text: version }]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Version"
                    text={version}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Product"
                    text="Secure Redact"
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Framework"
                    text="Raycast Extension"
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Platform"
                    text="macOS"
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />

        <List.Item
          title="Privacy"
          subtitle="100% offline guarantee"
          detail={
            <List.Item.Detail
              markdown={`# Privacy Guarantee

## 100% Offline Operation

Secure Redact operates completely offline with **zero network communication**:

- ✅ **No data transmission** - All processing happens locally on your device
- ✅ **No cloud services** - No external APIs or remote servers involved
- ✅ **No telemetry** - No usage statistics or analytics collected
- ✅ **No account required** - No sign-up, login, or user tracking

## Local Storage Only

All data is stored exclusively in Raycast's LocalStorage:

- **Audit entries**: \`secure-redact.audit.v1\` (capped at 500 entries)
- **Threat feeds**: \`secure-redact.feeds.v1\`

## What We Never Store

- Original input text or detected values
- Redacted output text or clipboard contents
- File contents, paths, or metadata
- Network activity or browsing history

## Detection Method

Pattern-based detection using:
- Regular expressions and checksum validation
- Luhn algorithm for credit cards
- IBAN mod-97 validation
- VIN check digit verification
- SSN area code validation

**No AI models, no machine learning, no external dependencies.**`}
            />
          }
        />

        <List.Item
          title="Open Source Signatures"
          subtitle="View detection patterns on GitHub"
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Source Code"
                    text="Detection patterns and algorithms"
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="26 Built-in Patterns"
                    text="JWT, API keys, credit cards, SSN, IBAN, crypto addresses, IPs, paths, and more"
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Repository"
                    text="https://github.com/placeholder/secure-redact"
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open GitHub Repository"
                url="https://github.com/placeholder/secure-redact"
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
