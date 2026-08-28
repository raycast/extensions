import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  confirmAlert,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useEffect, useState } from "react";
import { clearKatoCache, katoApi } from "./api";
import { accessTokenOptions } from "./oauth";
import { switchWorkspace } from "./oauth";
import type { WhoAmI } from "./types";

function ConnectionCommand() {
  const [connection, setConnection] = useState<WhoAmI>();
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      setConnection(await katoApi.whoami());
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => void load(), []);

  async function changeWorkspace() {
    const confirmed = await confirmAlert({
      title: "Switch Kato Workspace?",
      message:
        "Raycast will reconnect to Kato and ask which workspace you want to use.",
      primaryAction: { title: "Switch Workspace" },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening Kato…",
    });
    try {
      await switchWorkspace();
      clearKatoCache();
      await load();
      toast.style = Toast.Style.Success;
      toast.title = "Workspace switched";
    } catch (cause) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not switch workspace";
      toast.message = (cause as Error).message;
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        connection
          ? `# ${connection.workspace.name}\n\nConnected to Kato as ${connection.member.name ?? connection.member.email ?? "a workspace member"}.`
          : "# Current Workspace"
      }
      metadata={
        connection ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Workspace"
              text={connection.workspace.name}
            />
            <Detail.Metadata.Label
              title="Plan"
              text={connection.workspace.plan}
            />
            <Detail.Metadata.Label
              title="Member"
              text={
                connection.member.name ?? connection.member.email ?? "Member"
              }
            />
            {connection.member.role ? (
              <Detail.Metadata.Label
                title="Role"
                text={connection.member.role.replaceAll("_", " ")}
              />
            ) : null}
            {connection.expiresAt ? (
              <Detail.Metadata.Label
                title="Reconnect by"
                text={new Intl.DateTimeFormat(undefined, {
                  dateStyle: "long",
                }).format(new Date(connection.expiresAt))}
              />
            ) : null}
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <Action
            title="Switch Workspace"
            icon={Icon.Switch}
            onAction={() => void changeWorkspace()}
          />
          <Action
            title="Refresh Connection"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => {
              clearKatoCache();
              void load();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export default withAccessToken(accessTokenOptions)(ConnectionCommand);
