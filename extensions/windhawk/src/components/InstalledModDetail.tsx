import { ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { getInstalledModDetails } from "../utils/mods";
import { showFailureToast, usePromise } from "@raycast/utils";
import {
  CopyCommandsSubmenu,
  CopyModInfoSubmenu,
  OpenInBrowserAction,
  RefreshAction,
  ToggleModAction,
  UninstallModAction,
  ViewChangelogAction,
} from "./Actions";

export default function InstalledModDetail({ modId }: { modId: string }) {
  const {
    data: mod,
    isLoading,
    error,
    revalidate,
  } = usePromise(async () => {
    return await getInstalledModDetails(modId);
  });

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: "Failed to load installed mod details" });
  }

  const id = mod?.id;
  const version = mod?.metadata?.version;
  const readme = mod?.readme;
  const name = mod?.metadata?.name;
  const author = mod?.metadata?.author;
  const github = mod?.metadata?.github;
  const twitter = mod?.metadata?.twitter;
  const homepage = mod?.metadata?.homepage;
  const enabled = mod?.enabled;
  const updateAvailable = mod?.updateAvailable;
  const availableUpdateVersion = mod?.availableUpdateVersion;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={name}
      markdown={readme}
      metadata={
        isLoading ? (
          <Detail.Metadata>
            <></>
          </Detail.Metadata>
        ) : (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Mod ID">
              <Detail.Metadata.TagList.Item text={id} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label
              icon={
                enabled
                  ? { source: Icon.CheckCircle, tintColor: Color.Blue }
                  : { source: Icon.CircleDisabled, tintColor: Color.Orange }
              }
              title="Enabled"
              text={enabled ? { value: "Yes", color: Color.Blue } : { value: "No", color: Color.Orange }}
            />
            <Detail.Metadata.Label icon={Icon.Tag} title="Installed" text={version} />
            {updateAvailable ? (
              <Detail.Metadata.Label
                icon={{ source: Icon.Tag, tintColor: Color.Green }}
                title="Available"
                text={{ value: availableUpdateVersion ?? "latest", color: Color.Green }}
              />
            ) : undefined}
            <Detail.Metadata.Label icon={Icon.Person} title="Author" text={author} />
            {mod?.metadata?.github ? (
              <Detail.Metadata.Link title="GitHub" text={github ?? ""} target={github ?? ""} />
            ) : undefined}
            {mod?.metadata?.twitter ? (
              <Detail.Metadata.Link title="Twitter / X" text={twitter ?? ""} target={twitter ?? ""} />
            ) : undefined}
            {mod?.metadata?.homepage ? (
              <Detail.Metadata.Link title="Homepage" text={homepage ?? ""} target={homepage ?? ""} />
            ) : undefined}
            <Detail.Metadata.TagList title="Target Processes">
              {mod?.metadata?.include?.map((entry) => (
                <Detail.Metadata.TagList.Item key={entry} icon={Icon.BullsEye} text={entry} />
              ))}
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ToggleModAction id={id ?? ""} enabled={!mod?.config?.disabled} onSuccess={revalidate} />
            <UninstallModAction id={id ?? ""} name={name ?? ""} onSuccess={revalidate} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ViewChangelogAction id={id ?? ""} name={name ?? ""} />
            <OpenInBrowserAction id={id ?? ""} shortcut={Keyboard.Shortcut.Common.OpenWith} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyModInfoSubmenu id={id ?? ""} name={name ?? ""} version={version ?? ""} />
            <CopyCommandsSubmenu id={id ?? ""} />
          </ActionPanel.Section>
          <RefreshAction revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
}
