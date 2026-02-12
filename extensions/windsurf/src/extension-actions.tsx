import {
  showToast,
  Toast,
  Action,
  Icon,
  Color,
  confirmAlert,
  Alert,
  showHUD,
} from "@raycast/api";
import { getWindsurfCLI } from "./lib/windsurf";
import { getErrorMessage } from "./utils";

export function InstallExtensionByIDAction(props: {
  extensionID: string;
  afterInstall?: () => void;
}) {
  const handle = async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Install Extension",
      });
      const cli = getWindsurfCLI();
      cli.installExtensionByIDSync(props.extensionID);
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
  return (
    <Action
      onAction={handle}
      title="Install Extension"
      icon={{ source: Icon.Plus }}
    />
  );
}

export function UninstallExtensionByIDAction(props: {
  extensionID: string;
  afterUninstall?: () => void;
}) {
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
          title: "Uninstall Extension",
        });
        const cli = getWindsurfCLI();
        cli.uninstallExtensionByIDSync(props.extensionID);
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
    />
  );
}

export function OpenExtensionByIDInWindsurfAction(props: {
  extensionID: string;
  onOpen?: (url: string) => void;
}) {
  return (
    <Action.OpenInBrowser
      title="Open in Windsurf"
      url={`windsurf:extension/${props.extensionID}`}
      icon={"windsurf-icon.png"}
      onOpen={(url) => {
        showHUD("Open Windsurf Extension");
        if (props.onOpen) {
          props.onOpen(url);
        }
      }}
    />
  );
}

export function OpenExtensionByIDInBrowserAction(props: {
  extensionID: string;
}) {
  const url = `https://marketplace.visualstudio.com/items?itemName=${props.extensionID}`;
  return (
    <Action.OpenInBrowser
      title="Open in Browser"
      url={url}
      shortcut={{ modifiers: ["cmd"], key: "b" }}
      onOpen={() => {
        showHUD("Open Extension in Browser");
      }}
    />
  );
}
