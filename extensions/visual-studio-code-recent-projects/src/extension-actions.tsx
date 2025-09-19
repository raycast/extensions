import { Action, Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getBuildNamePreference, getBuildScheme, getVSCodeCLI } from "./lib/vscode";
import { getErrorMessage } from "./utils";
import { getEditorApplication } from "./utils/editor";

export function InstallExtensionByIDAction(props: { extensionID: string; afterInstall?: () => void }): JSX.Element {
  const handle = async () => {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Install Extension" });
      const cli = getVSCodeCLI();
      await cli.installExtensionByID(props.extensionID);
      await showToast({ style: Toast.Style.Success, title: "Install Successful" });
      if (props.afterInstall) {
        props.afterInstall();
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  return <Action onAction={handle} title="Install Extension" icon={{ source: Icon.Plus }} />;
}

export function UninstallExtensionByIDAction(props: {
  extensionID: string;
  extensionName?: string;
  afterUninstall?: () => void;
}): JSX.Element {
  const handle = async () => {
    try {
      if (
        await confirmAlert({
          title: props.extensionName ? `Uninstall "${props.extensionName}" extension?` : "Uninstall extension?",
          icon: Icon.Trash,
          primaryAction: { style: Alert.ActionStyle.Destructive, title: "Uninstall" },
        })
      ) {
        await showToast({ style: Toast.Style.Animated, title: "Uninstall Extension" });
        const cli = getVSCodeCLI();
        await cli.uninstallExtensionByID(props.extensionID);
        await showToast({ style: Toast.Style.Success, title: "Uninstall Successful" });
        if (props.afterUninstall) {
          props.afterUninstall();
        }
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  return (
    <Action
      onAction={handle}
      title="Uninstall Extension"
      style={Action.Style.Destructive}
      icon={Icon.Trash}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
    />
  );
}

export function OpenExtensionByIDInVSCodeAction(props: {
  extensionID: string;
  onOpen?: (url: string) => void;
}): JSX.Element {
  const buildName = getBuildNamePreference();

  const { data: editorApp } = usePromise(async () => {
    return getEditorApplication(buildName);
  });

  const url = `${getBuildScheme()}:extension/${props.extensionID}`;
  const title = `Open in ${buildName}`;

  return <Action.OpenInBrowser title={title} url={url} icon={editorApp ? { fileIcon: editorApp.path } : "icon.png"} />;
}

export function OpenExtensionByIDInBrowserAction(props: { extensionID: string }): JSX.Element {
  const url = `https://marketplace.visualstudio.com/items?itemName=${props.extensionID}`;
  return <Action.OpenInBrowser title="Open in Browser" url={url} shortcut={{ modifiers: ["cmd"], key: "b" }} />;
}
