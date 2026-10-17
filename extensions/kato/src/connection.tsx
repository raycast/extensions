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
  const [error, setError] = useState<string>();

  async function load(toast?: Toast) {
    setIsLoading(true);
    setError(undefined);
    try {
      setConnection(await katoApi.whoami());
      return true;
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "An unexpected error occurred.";
      setConnection(undefined);
      setError(message);
      const options = {
        style: Toast.Style.Failure,
        title: "Could not load Kato connection",
        message,
      };
      if (toast) {
        Object.assign(toast, options);
      } else {
        await showToast(options);
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => void load(), []);

  async function changeWorkspace() {
    const confirmed = await confirmAlert({
      title: error ? "Reconnect to Kato?" : "Switch Kato Workspace?",
      message:
        "Raycast will reconnect to Kato and ask which workspace you want to use.",
      primaryAction: { title: error ? "Reconnect" : "Switch Workspace" },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening Kato…",
    });
    try {
      setConnection(undefined);
      await switchWorkspace();
      clearKatoCache();
      if (!(await load(toast))) return;
      toast.style = Toast.Style.Success;
      toast.title = error ? "Reconnected to Kato" : "Workspace switched";
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "An unexpected error occurred.";
      setError(message);
      toast.style = Toast.Style.Failure;
      toast.title = error
        ? "Could not reconnect to Kato"
        : "Could not switch workspace";
      toast.message = message;
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        error
          ? `# Could not load Kato connection\n\n${error}\n\nCheck your internet connection and choose **Retry Connection**. If access was rejected or expired, choose **Reconnect to Kato** to sign in again and select a workspace.`
          : connection
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
          {error ? (
            <Action
              title="Retry Connection"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => {
                clearKatoCache();
                void load();
              }}
            />
          ) : null}
          <Action
            title={error ? "Reconnect to Kato" : "Switch Workspace"}
            icon={Icon.Switch}
            onAction={() => void changeWorkspace()}
          />
          {!error ? (
            <Action
              title="Refresh Connection"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => {
                clearKatoCache();
                void load();
              }}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

export default withAccessToken(accessTokenOptions)(ConnectionCommand);
