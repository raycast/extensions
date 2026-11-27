import { Action, ActionPanel, confirmAlert, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type * as Types from "@ui/types";
import * as Context from "@ui/context";
import * as React from "react";
import ServerForm from "@ui/ServerForm/main";
import { localStorage } from "@ui/localstorage";

function ActionChangeSelectedServer({
  glpiServer,
  selectedGlpiServer,
  revalidateSelectedGlpiServer,
}: {
  glpiServer: Types.GlpiServer;
  selectedGlpiServer?: string;
  revalidateSelectedGlpiServer?: () => Promise<string | undefined>;
}): React.JSX.Element {
  const isCurrent = glpiServer.uuid === selectedGlpiServer;

  /**
   * Change selected server and revalidate.
   */
  const onAction = React.useCallback(async () => {
    if (isCurrent) return;
    try {
      await localStorage.setSelectedGlpiServer(glpiServer.uuid);
      if (revalidateSelectedGlpiServer) await revalidateSelectedGlpiServer();
    } catch (e) {
      showFailureToast(e);
      return;
    }
  }, [glpiServer, isCurrent]);

  return (
    <Action title={`${glpiServer.name}${isCurrent ? " (Current)" : ""}`} autoFocus={isCurrent} onAction={onAction} />
  );
}

function ActionPanelSubmenuChangeSelectedServer(): React.JSX.Element {
  /* Context */
  const ctxGlpiServer = React.useContext(Context.glpiServer);

  if (
    !ctxGlpiServer.revalidateSelectedGlpiServer ||
    !ctxGlpiServer.glpiServerConfig ||
    ctxGlpiServer.glpiServerConfig.length === 0
  )
    return <React.Fragment />;

  return (
    <ActionPanel.Submenu title="Change Selected Server" icon={Icon.HardDrive}>
      {ctxGlpiServer.glpiServerConfig!.map((v, i) => (
        <ActionChangeSelectedServer
          key={i}
          glpiServer={v}
          selectedGlpiServer={ctxGlpiServer.selectedGlpiServer}
          revalidateSelectedGlpiServer={ctxGlpiServer.revalidateSelectedGlpiServer}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

function ActionEditServer({
  glpiServer,
  selectedGlpiServer,
  revalidateGlpiServerConfig,
}: {
  glpiServer: Types.GlpiServer;
  selectedGlpiServer?: string;
  revalidateGlpiServerConfig?: () => Promise<Types.GlpiServer[] | undefined>;
}): React.JSX.Element {
  const isCurrent = glpiServer.uuid === selectedGlpiServer;

  const onActionDelete = React.useCallback(async () => {
    if (!revalidateGlpiServerConfig) return;

    /* Wait User Confirm */
    await confirmAlert({
      title: "Are you sure?",
      message: `This action will delete '${glpiServer.name}' server configuration.`,
      primaryAction: {
        title: `Yes, Delete "${glpiServer.name}"`,
        onAction: async () => {
          try {
            await localStorage.removeGlpiServerConfig(glpiServer);
            await revalidateGlpiServerConfig();
          } catch (e) {
            await showFailureToast(e);
          }
        },
      },
    });
    return;
  }, [glpiServer, revalidateGlpiServerConfig]);

  if (!revalidateGlpiServerConfig) return <React.Fragment />;

  return (
    <ActionPanel.Submenu title={`${glpiServer.name}${isCurrent ? " (Current)" : ""}`} icon={Icon.HardDrive}>
      <Action.Push
        title="Edit Server"
        icon={Icon.Pencil}
        target={<ServerForm revalidate={revalidateGlpiServerConfig} glpiServer={glpiServer} />}
      />
      <Action style={Action.Style.Destructive} title="Delete Server" icon={Icon.Trash} onAction={onActionDelete} />
    </ActionPanel.Submenu>
  );
}

function ActionPanelSubmenuEditServer(): React.JSX.Element {
  /* Context */
  const ctxGlpiServer = React.useContext(Context.glpiServer);

  if (
    !ctxGlpiServer.revalidateSelectedGlpiServer ||
    !ctxGlpiServer.glpiServerConfig ||
    ctxGlpiServer.glpiServerConfig.length === 0
  )
    return <React.Fragment />;

  return (
    <ActionPanel.Submenu title="Edit Server" icon={Icon.Pencil}>
      {ctxGlpiServer.glpiServerConfig!.map((v, i) => (
        <ActionEditServer
          key={i}
          glpiServer={v}
          selectedGlpiServer={ctxGlpiServer.selectedGlpiServer}
          revalidateGlpiServerConfig={ctxGlpiServer.revalidateGlpiServerConfig}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

export default function ActionPanelSectionServer(): React.JSX.Element {
  /* Context */
  const ctxIsLoading = React.useContext(Context.isLoading);
  const ctxGlpiServer = React.useContext(Context.glpiServer);

  if (ctxIsLoading.isLoading) return <React.Fragment />;

  return (
    <ActionPanel.Section title="Glpi Server">
      <ActionPanelSubmenuChangeSelectedServer />
      {ctxGlpiServer.revalidateGlpiServerConfig && (
        <Action.Push
          title="Add Server"
          icon={Icon.Plus}
          target={
            <ServerForm
              glpiServerConfig={ctxGlpiServer.glpiServerConfig}
              revalidate={ctxGlpiServer.revalidateGlpiServerConfig}
            />
          }
        />
      )}
      <ActionPanelSubmenuEditServer />
    </ActionPanel.Section>
  );
}
