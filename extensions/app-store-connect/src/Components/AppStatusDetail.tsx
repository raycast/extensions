import { Action, ActionPanel, Color, Detail, Icon, useNavigation } from "@raycast/api";
import { getPlatformIcon, getPlatformLabel, getStatusInfo } from "../Utils/statusHelpers";
import { ProcessedApp } from "../appStatus";
import { ReleaseAppAction } from "./AppStatusListItem";

export default function AppStatusDetail({ app }: { app: ProcessedApp }) {
  const { pop } = useNavigation();
  const statusInfo = app.latestVersion ? getStatusInfo(app.latestVersion.state) : null;

  const markdown = buildMarkdown(app);

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="App ID" text={app.id} />
          <Detail.Metadata.Label title="Bundle ID" text={app.bundleId} />
          <Detail.Metadata.Separator />
          {app.latestVersion && (
            <>
              <Detail.Metadata.TagList title="Status">
                <Detail.Metadata.TagList.Item
                  text={statusInfo?.label ?? app.latestVersion.state}
                  color={statusInfo?.color ?? Color.SecondaryText}
                />
              </Detail.Metadata.TagList>
              <Detail.Metadata.Label title="Version" text={app.latestVersion.versionString} />
              <Detail.Metadata.Label
                title="Platform"
                text={getPlatformLabel(app.latestVersion.platform)}
                icon={getPlatformIcon(app.latestVersion.platform)}
              />
              <Detail.Metadata.Label title="Created" text={formatDate(app.latestVersion.createdDate)} />
              {app.latestVersion.releaseType && (
                <Detail.Metadata.Label title="Release Type" text={app.latestVersion.releaseType} />
              )}
            </>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="App Store Connect" target={app.appStoreConnectUrl} text="Open in Browser" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ReleaseAppAction app={app} onSuccess={pop} />
          <Action.OpenInBrowser title="Open in App Store Connect" url={app.appStoreConnectUrl} icon={Icon.Globe} />
          <Action.CopyToClipboard
            title="Copy Bundle ID"
            content={app.bundleId}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action.CopyToClipboard
            title="Copy App ID"
            content={app.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}

function buildMarkdown(app: ProcessedApp): string {
  const statusInfo = app.latestVersion ? getStatusInfo(app.latestVersion.state) : null;
  const versionSection = app.latestVersion
    ? `
| Field | Value |
|-------|-------|
| **Version** | ${app.latestVersion.versionString} |
| **Status** | ${statusInfo?.label ?? app.latestVersion.state} |
| **Platform** | ${getPlatformLabel(app.latestVersion.platform)} |
| **Created** | ${formatDate(app.latestVersion.createdDate)} |
| **Release Type** | ${app.latestVersion.releaseType ?? "N/A"} |
`
    : "*No version available*";

  return `# ${app.name}

**Bundle ID:** \`${app.bundleId}\`

---

## Latest Version
${versionSection}
`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
