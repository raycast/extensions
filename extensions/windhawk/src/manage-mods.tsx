import { ActionPanel, List, Icon, Color, Keyboard } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { getInstalledMods } from "./utils/mods";
import InstalledModDetail from "./components/InstalledModDetail";
import {
  CopyCommandsSubmenu,
  CopyModInfoSubmenu,
  ManageElevationAction,
  OpenInBrowserAction,
  RefreshAction,
  ShowDetailsAction,
  ToggleModAction,
  UninstallModAction,
  UpdateModAction,
  ViewChangelogAction,
  ViewInstalledModSourceCodeAction,
} from "./components/Actions";

export default function Command() {
  const {
    data: mods,
    isLoading,
    error,
    revalidate,
  } = usePromise(async () => {
    return await getInstalledMods();
  });

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: "Failed to load mods" });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search installed mods…" isShowingDetail throttle>
      <List.Section title="Installed" subtitle={mods?.length.toString()}>
        {mods?.map((mod) => {
          const id = mod.id;
          const version = mod.version;
          const name = mod.name;
          const author = mod.author;
          const description = mod.description;
          const enabled = mod.enabled;
          const updateAvailable = mod.updateAvailable;
          const availableUpdateVersion = mod.availableUpdateVersion;

          return (
            <List.Item
              key={id}
              keywords={[id]}
              title={name}
              detail={
                <List.Item.Detail
                  markdown={`## ${name}\n\n---\n\n${description}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.TagList title="Mod ID">
                        <List.Item.Detail.Metadata.TagList.Item text={id} />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Label
                        icon={
                          enabled
                            ? { source: Icon.CheckCircle, tintColor: Color.Blue }
                            : { source: Icon.CircleDisabled, tintColor: Color.Orange }
                        }
                        title="Enabled"
                        text={enabled ? { value: "Yes", color: Color.Blue } : { value: "No", color: Color.Orange }}
                      />
                      <List.Item.Detail.Metadata.Label icon={Icon.Tag} title="Installed" text={version} />
                      {updateAvailable ? (
                        <List.Item.Detail.Metadata.Label
                          icon={{ source: Icon.Tag, tintColor: Color.Green }}
                          title="Available"
                          text={{ value: availableUpdateVersion ?? "latest", color: Color.Green }}
                        />
                      ) : undefined}
                      <List.Item.Detail.Metadata.Label icon={Icon.Person} title="Author" text={author} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              accessories={[
                {
                  icon: enabled
                    ? { source: Icon.CheckCircle, tintColor: Color.Blue }
                    : { source: Icon.CircleDisabled, tintColor: Color.Orange },
                  tooltip: enabled ? "Enabled" : "Disabled",
                },
                ...(updateAvailable
                  ? [
                      {
                        icon: { source: Icon.ArrowUpCircle, tintColor: Color.Green },
                        tooltip: `Update: ${availableUpdateVersion ?? "latest"}`,
                      },
                    ]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <ShowDetailsAction target={<InstalledModDetail modId={id} />} />
                    <ToggleModAction enabled={enabled} id={id} onSuccess={revalidate} />
                    {updateAvailable ? <UpdateModAction id={id} onSuccess={revalidate} /> : undefined}
                    <UninstallModAction id={id} name={name} onSuccess={revalidate} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <ViewChangelogAction id={id} name={name} />
                    <ViewInstalledModSourceCodeAction id={id} name={name} />
                    <OpenInBrowserAction id={id} shortcut={Keyboard.Shortcut.Common.OpenWith} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <CopyModInfoSubmenu id={id} name={name ?? ""} version={version ?? ""} />
                    <CopyCommandsSubmenu id={id} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <RefreshAction revalidate={revalidate} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <ManageElevationAction />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
