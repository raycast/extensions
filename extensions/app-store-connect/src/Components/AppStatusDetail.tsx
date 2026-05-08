import { Action, ActionPanel, Color, Detail, Icon, useNavigation } from "@raycast/api";
import { getPlatformIcon, getPlatformLabel, getStatusInfo } from "../Utils/statusHelpers";
import { ProcessedApp, ProcessedAppVersion } from "../appStatus";
import { ReleaseAppAction } from "./AppStatusListItem";

export default function AppStatusDetail({
  app,
  version,
}: {
  app: ProcessedApp;
  version: ProcessedAppVersion | undefined;
}) {
  const { pop } = useNavigation();
  const statusInfo = version ? getStatusInfo(version.state) : null;

  const markdown = buildMarkdown(app, version);

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="App ID" text={app.id} />
          <Detail.Metadata.Label title="Bundle ID" text={app.bundleId} />
          <Detail.Metadata.Separator />
          {version && (
            <>
              <Detail.Metadata.TagList title="Status">
                <Detail.Metadata.TagList.Item
                  text={statusInfo?.label ?? version.state}
                  color={statusInfo?.color ?? Color.SecondaryText}
                />
              </Detail.Metadata.TagList>
              <Detail.Metadata.Label title="Version" text={version.versionString} />
              <Detail.Metadata.Label
                title="Platform"
                text={getPlatformLabel(version.platform)}
                icon={getPlatformIcon(version.platform)}
              />
              <Detail.Metadata.Label title="Created" text={formatDate(version.createdDate)} />
              {version.releaseType && <Detail.Metadata.Label title="Release Type" text={version.releaseType} />}
            </>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="App Store Connect" target={app.appStoreConnectUrl} text="Open in Browser" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ReleaseAppAction app={app} version={version} onSuccess={pop} />
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

function buildMarkdown(app: ProcessedApp, version: ProcessedAppVersion | undefined): string {
  const statusInfo = version ? getStatusInfo(version.state) : null;
  const versionSection = version
    ? `
| Field | Value |
|-------|-------|
| **Version** | ${version.versionString} |
| **Status** | ${statusInfo?.label ?? version.state} |
| **Platform** | ${getPlatformLabel(version.platform)} |
| **Created** | ${formatDate(version.createdDate)} |
| **Release Type** | ${version.releaseType ?? "N/A"} |
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
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
