import { usePromise } from "@raycast/utils";
import {
  Action,
  ActionPanel,
  Application,
  getApplications,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { setMacOSIcon } from "../../utils";
import React from "react";
import { IconHit } from "../../types";
import { DB } from "../../db";

export type ActionProps = { icon: IconHit };

const SetForApplication = ({ icon }: ActionProps) => {
  const { data } = usePromise(getApplications);

  const update = async (app: Application) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Updating application with new icon`,
    });

    try {
      await setMacOSIcon(app.path, icon.icnsUrl!);
      await DB.addToHistory(app.bundleId!, {
        ...icon,
        date: new Date().toString(),
      });

      toast.style = Toast.Style.Success;
      toast.title = `${app.name} updated, might've caused screen to flicker once`;
    } catch (e) {
      toast.style = Toast.Style.Failure;

      toast.title = e?.toString() ?? "Something went wrong";
    }
  };
  return (
    <ActionPanel.Submenu title="Save As New Icon For" icon={Icon.Highlight}>
      {(data ?? []).map((app) => {
        return (
          <Action
            icon={{ fileIcon: app.path }}
            title={app.name}
            onAction={() => update(app)}
            key={app.bundleId}
          />
        );
      })}
    </ActionPanel.Submenu>
  );
};

const SaveUsingBrowser = ({ icon }: ActionProps) => (
  <Action.Open
    title="Open(Save) Using Browser"
    target={icon.icnsUrl ?? ""}
    icon={Icon.Download}
  />
);

const CopyURLToClipboard = ({ icon }: ActionProps) => (
  <Action.CopyToClipboard
    title="Copy URL to Clipboard"
    content={{ html: icon.icnsUrl ?? icon.appName }}
    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
  ></Action.CopyToClipboard>
);

export const IconActions = ({ icon }: { icon: IconHit }) => (
  <ActionPanel.Section>
    <SetForApplication icon={icon} />
    <SaveUsingBrowser icon={icon} />
    <CopyURLToClipboard icon={icon} />
  </ActionPanel.Section>
);
