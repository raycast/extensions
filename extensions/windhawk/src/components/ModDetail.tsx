import { ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { getModDetails } from "../utils/mods";
import {
  CopyCommandsSubmenu,
  CopyModInfoSubmenu,
  InstallModAction,
  InstallVersionAction,
  InstallVersionSubmenu,
  OpenInBrowserAction,
  RefreshAction,
  ToggleModAction,
  UninstallModAction,
  UpdateModAction,
  ViewChangelogAction,
  ViewModSourceCodeAction,
} from "./Actions";
import { preferences } from "../utils/helpers";

export default function ModDetail({ modId }: { modId: string }) {
  const installVersionOpensTo = preferences.installVersionOpensTo;

  const {
    data: mod,
    isLoading,
    error,
    revalidate,
  } = usePromise(async () => {
    return await getModDetails(modId);
  });

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: "Failed to load mod details" });
  }

  const id = mod?.id;
  const version = mod?.metadata?.version;
  const readme = mod?.readme;
  const name = mod?.metadata?.name;
  const author = mod?.metadata?.author;
  const github = mod?.metadata?.github;
  const twitter = mod?.metadata?.twitter;
  const homepage = mod?.metadata?.homepage;
  const installed = mod?.installed;
  const enabled = mod?.enabled;
  const updateAvailable = mod?.updateAvailable;
  const installedVersion = mod?.installedVersion;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={name}
      markdown={readme ?? "## _Loading…_"}
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
            {installed ? (
              <Detail.Metadata.Label
                icon={
                  enabled
                    ? { source: Icon.CheckCircle, tintColor: Color.Blue }
                    : { source: Icon.CircleDisabled, tintColor: Color.Orange }
                }
                title="Enabled"
                text={enabled ? { value: "Yes", color: Color.Blue } : { value: "No", color: Color.Orange }}
              />
            ) : undefined}
            <Detail.Metadata.Label
              icon={Icon.Tag}
              title={installed ? "Installed" : "Version"}
              text={installed ? (installedVersion ?? "") : version}
            />
            {installed && updateAvailable ? (
              <Detail.Metadata.Label
                icon={{ source: Icon.Tag, tintColor: Color.Green }}
                title="Available"
                text={{ value: version ?? "", color: Color.Green }}
              />
            ) : undefined}
            <Detail.Metadata.Label icon={Icon.Person} title="Author" text={author} />
            {github ? <Detail.Metadata.Link title="GitHub" text={github ?? ""} target={github ?? ""} /> : undefined}
            {twitter ? (
              <Detail.Metadata.Link title="Twitter / X" text={twitter ?? ""} target={twitter ?? ""} />
            ) : undefined}
            {homepage ? (
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
        !isLoading ? (
          <ActionPanel>
            <ActionPanel.Section>
              {!installed ? (
                <>
                  <InstallModAction id={id ?? ""} />
                  {installVersionOpensTo === "submenu" ? (
                    <InstallVersionSubmenu id={id ?? ""} />
                  ) : (
                    <InstallVersionAction id={id ?? ""} />
                  )}
                </>
              ) : (
                <>
                  <ToggleModAction enabled={enabled as boolean} id={id as string} onSuccess={revalidate} />
                  {updateAvailable ? <UpdateModAction id={id as string} onSuccess={revalidate} /> : undefined}
                  <UninstallModAction id={id as string} name={name as string} onSuccess={revalidate} />
                </>
              )}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <ViewChangelogAction id={id ?? ""} name={name ?? ""} />
              <ViewModSourceCodeAction id={id ?? ""} name={name ?? ""} />
              <OpenInBrowserAction id={id ?? ""} shortcut={Keyboard.Shortcut.Common.OpenWith} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <CopyModInfoSubmenu id={id ?? ""} name={name ?? ""} version={version ?? ""} />
              <CopyCommandsSubmenu id={id ?? ""} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <RefreshAction revalidate={revalidate} />
            </ActionPanel.Section>
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
