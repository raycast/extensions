import type { JSX } from "react";
import { showToast, Toast, Action, Icon, Color, confirmAlert, Alert, showHUD, Keyboard } from "@raycast/api";
import { getCursorCLI } from "./lib/cursor";
import { getErrorMessage } from "./utils";
import { shortcut } from "./utils/shortcuts";

export function InstallExtensionByIDAction(props: { extensionID: string; afterInstall?: () => void }): JSX.Element {
  const handle = async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Install Extension",
      });
      const cli = getCursorCLI();
      await cli.installExtensionByID(props.extensionID);
      await showToast({
        style: Toast.Style.Success,
        title: "Install Successful",
      });
      if (props.afterInstall) {
        props.afterInstall();
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: getErrorMessage(error),
      });
    }
  };
  return <Action onAction={handle} title="Install Extension" icon={{ source: Icon.Plus }} />;
}

export function UninstallExtensionByIDAction(props: { extensionID: string; afterUninstall?: () => void }): JSX.Element {
  const handle = async () => {
    try {
      if (
        await confirmAlert({
          title: "Uninstall Extension?",
          icon: { source: Icon.Trash, tintColor: Color.Red },
          primaryAction: {
            style: Alert.ActionStyle.Destructive,
            title: "Uninstall",
          },
        })
      ) {
        await showToast({
          style: Toast.Style.Animated,
          title: "Install Extension",
        });
        const cli = getCursorCLI();
        await cli.uninstallExtensionByID(props.extensionID);
        await showToast({
          style: Toast.Style.Success,
          title: "Uninstall Successful",
        });
        if (props.afterUninstall) {
          props.afterUninstall();
        }
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: getErrorMessage(error),
      });
    }
  };
  return (
    <Action
      onAction={handle}
      title="Uninstall Extension"
      icon={{ source: Icon.Trash, tintColor: Color.Red }}
      shortcut={Keyboard.Shortcut.Common.Remove}
    />
  );
}

export function OpenExtensionByIDInCursorAction(props: {
  extensionID: string;
  onOpen?: (url: string) => void;
}): JSX.Element {
  return (
    <Action.OpenInBrowser
      title="Open in Cursor"
      url={`cursor:extension/${props.extensionID}`}
      icon={"icon.png"}
      onOpen={(url) => {
        showHUD("Open Cursor Extension");
        if (props.onOpen) {
          props.onOpen(url);
        }
      }}
    />
  );
}

export function OpenExtensionByIDInBrowserAction(props: { extensionID: string }): JSX.Element {
  const url = `https://marketplace.visualstudio.com/items?itemName=${props.extensionID}`;
  return (
    <Action.OpenInBrowser
      title="Open in Browser"
      url={url}
      shortcut={shortcut(["cmd"], "b")}
      onOpen={() => {
        showHUD("Open Cursor Extension in Browser");
      }}
    />
  );
}
