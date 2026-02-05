import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { ProvisioningProfile } from "../types";
import { DeviceList } from "./DeviceList";

export function getMarkdown(profile: ProvisioningProfile) {
  return [
    "## Entitlements",
    "",
    "```json",
    JSON.stringify(profile.Entitlements, null, 2),
    "```",
    "",
    "## Certificates",
    "",
    profile.DeveloperCertificates.map(
      (cert) => `- **${cert.subject.commonName}** (Expires: ${cert.validity.notAfter.toLocaleDateString()})`,
    ).join("\n"),
  ].join("\n");
}

function MetadataLabels({ profile }: { profile: ProvisioningProfile }) {
  const hasDevices = profile.ProvisionedDevices && profile.ProvisionedDevices.length > 0;

  return (
    <>
      <Detail.Metadata.Label title="UUID" text={profile.UUID} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="App ID Name" text={profile.AppIDName} />
      {profile.Entitlements["application-identifier"] && (
        <Detail.Metadata.Label
          title="App Identifier"
          text={profile.Entitlements["application-identifier"]?.split(".").slice(1).join(".")}
        />
      )}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Team Name" text={profile.TeamName} />
      <Detail.Metadata.Label title="Team Identifier" text={profile.TeamIdentifier[0]} />
      {hasDevices && (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Devices" text={profile.ProvisionedDevices?.length.toString()} />
        </>
      )}

      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Creation Date" text={profile.CreationDate.toLocaleString()} />
      <Detail.Metadata.Label title="Expiration Date" text={profile.ExpirationDate.toLocaleString()} />
    </>
  );
}

export function DetailMetadata({ profile }: { profile: ProvisioningProfile }) {
  return (
    <Detail.Metadata>
      <MetadataLabels profile={profile} />
    </Detail.Metadata>
  );
}

export function ProfileActions({ profile }: { profile: ProvisioningProfile }) {
  const hasDevices = profile.ProvisionedDevices && profile.ProvisionedDevices.length > 0;

  return (
    <>
      {hasDevices && (
        <Action.Push
          title="Show Devices"
          icon={Icon.List}
          target={<DeviceList deviceIds={profile.ProvisionedDevices!} />}
        />
      )}
      <ActionPanel.Section>
        <Action.ShowInFinder path={profile.filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
        <Action.ToggleQuickLook title="Quick Look" shortcut={{ modifiers: ["cmd"], key: "y" }} />
        <Action.CopyToClipboard
          title="Copy Path"
          content={profile.filePath}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />
        <Action.CopyToClipboard title="Copy Uuid" content={profile.UUID} />
        <Action.CopyToClipboard title="Copy Team ID" content={profile.TeamIdentifier[0]} />
        {profile.Entitlements["application-identifier"] && (
          <Action.CopyToClipboard
            title="Copy Application Identifier"
            content={profile.Entitlements["application-identifier"]}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Trash
          title="Remove Provision"
          paths={[profile.filePath]}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
        />
      </ActionPanel.Section>
    </>
  );
}
