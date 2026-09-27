import { ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getMods } from "./utils/mods";
import { Mod } from "./types";
import {
  CopyCommandsSubmenu,
  CopyModInfoSubmenu,
  InstallModAction,
  InstallVersionAction,
  InstallVersionSubmenu,
  OpenInBrowserAction,
  RefreshAction,
  ShowDetailsAction,
  ToggleModAction,
  UninstallModAction,
  UpdateModAction,
  ViewChangelogAction,
  ViewModSourceCodeAction,
} from "./components/Actions";
import { preferences } from "./utils/helpers";
import ModDetail from "./components/ModDetail";

export default function Command() {
  const installVersionOpensTo = preferences.installVersionOpensTo;

  const {
    data: mods,
    isLoading,
    error,
    revalidate,
  } = usePromise(async () => {
    return await getMods();
  });

  const [patches, setPatches] = useState<Record<string, Partial<Mod>>>({});

  useEffect(() => {
    setPatches({});
  }, [mods]);

  const patchMod = (id: string, patch: Partial<Mod>) => {
    setPatches((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: "Failed to load mods" });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search mods…" isShowingDetail throttle>
      <List.Section title="Results" subtitle={mods?.length.toString()}>
        {mods?.map((mod) => {
          const patched = { ...mod, ...patches[mod.id] };
          const id = mod.id;
          const author = mod.metadata.author;
          const description = mod.metadata.description;
          const github = mod.metadata.github;
          const name = mod.metadata.name;
          const version = mod.metadata.version;
          const installed = patched.installed;
          const enabled = patched.enabled;
          const installedVersion = patched.installedVersion;
          const updateAvailable = patched.updateAvailable;

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
                      {installed ? (
                        <List.Item.Detail.Metadata.Label
                          icon={
                            enabled
                              ? { source: Icon.CheckCircle, tintColor: Color.Blue }
                              : { source: Icon.CircleDisabled, tintColor: Color.Orange }
                          }
                          title="Enabled"
                          text={enabled ? { value: "Yes", color: Color.Blue } : { value: "No", color: Color.Orange }}
                        />
                      ) : undefined}
                      <List.Item.Detail.Metadata.Label
                        icon={Icon.Tag}
                        title={installed ? "Installed" : "Version"}
                        text={installed ? (installedVersion ?? "") : version}
                      />
                      {installed && updateAvailable ? (
                        <List.Item.Detail.Metadata.Label
                          icon={{ source: Icon.Tag, tintColor: Color.Green }}
                          title="Available"
                          text={{ value: version, color: Color.Green }}
                        />
                      ) : undefined}
                      <List.Item.Detail.Metadata.Label icon={Icon.Person} title="Author" text={author} />
                      <List.Item.Detail.Metadata.Link title="GitHub" text={github} target={github} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              accessories={[
                ...(installed
                  ? [
                      enabled
                        ? { icon: { source: Icon.CheckCircle, tintColor: Color.Blue }, tooltip: "Installed · Enabled" }
                        : {
                            icon: { source: Icon.CircleDisabled, tintColor: Color.Orange },
                            tooltip: "Installed · Disabled",
                          },
                    ]
                  : []),
                ...(updateAvailable
                  ? [{ icon: { source: Icon.ArrowUpCircle, tintColor: Color.Green }, tooltip: `Update: ${version}` }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {!installed ? (
                      <>
                        <ShowDetailsAction target={<ModDetail modId={id} />} />
                        <InstallModAction
                          id={id}
                          onSuccess={() =>
                            patchMod(id, {
                              installed: true,
                              enabled: true,
                              updateAvailable: false,
                              installedVersion: version,
                            })
                          }
                        />
                        {installVersionOpensTo === "submenu" ? (
                          <InstallVersionSubmenu
                            id={id}
                            onSuccess={(installedVersion) =>
                              patchMod(id, {
                                installed: true,
                                enabled: true,
                                updateAvailable: installedVersion !== version,
                                installedVersion,
                              })
                            }
                            shortcut={{ modifiers: ["ctrl", "shift"], key: "enter" }}
                          />
                        ) : (
                          <InstallVersionAction
                            id={id}
                            onSuccess={(installedVersion) =>
                              patchMod(id, {
                                installed: true,
                                enabled: true,
                                updateAvailable: installedVersion !== version,
                                installedVersion,
                              })
                            }
                            shortcut={{ modifiers: ["ctrl", "shift"], key: "enter" }}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <ShowDetailsAction target={<ModDetail modId={id} />} />
                        <ToggleModAction
                          enabled={enabled}
                          id={id}
                          onSuccess={() => patchMod(id, { enabled: !enabled })}
                        />
                        {updateAvailable ? (
                          <UpdateModAction
                            id={id}
                            onSuccess={() => patchMod(id, { installedVersion: version, updateAvailable: false })}
                          />
                        ) : undefined}
                        <UninstallModAction
                          id={id}
                          name={name}
                          onSuccess={() =>
                            patchMod(id, {
                              installed: false,
                              enabled: false,
                              updateAvailable: false,
                              installedVersion: null,
                            })
                          }
                        />
                      </>
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <ViewChangelogAction id={id} name={name ?? ""} />
                    <ViewModSourceCodeAction id={id} name={name ?? ""} />
                    <OpenInBrowserAction id={id} shortcut={Keyboard.Shortcut.Common.OpenWith} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <CopyModInfoSubmenu id={id} name={name ?? ""} version={version ?? ""} />
                    <CopyCommandsSubmenu id={id} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <RefreshAction revalidate={revalidate} />
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
