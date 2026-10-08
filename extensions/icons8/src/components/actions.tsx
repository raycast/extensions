import {
  Action,
  ActionPanel,
  Toast,
  showToast,
  Icon,
  Color,
  open,
  showInFinder,
  Clipboard,
  closeMainWindow,
} from "@raycast/api";
import { IconStorageActions, appendRecentIcon } from "../utils/storage";
import { ConfigureAction } from "./configure-icon";
import { IconDetail } from "./icon-detail";
import { getIconDetail } from "../hooks/api";
import { Icon8, IconProps, IconActionProps } from "../types/types";
import { getIconImageLink } from "../utils/utils";
import fetch from "node-fetch";
import fs from "fs";

const addRecentIcon = async (icon: Icon8, refresh: () => void) => {
  await appendRecentIcon(icon);
  refresh();
};

export const IconActionPanel = (args: { props: IconProps; detailView?: boolean }): JSX.Element => {
  const props = args.props;

  return (
    <ActionPanel>
      {!args.detailView && <ViewIcon {...props} />}
      <OpenInBrowser {...props} />
      <ConfigureAction {...props} />
      <ActionPanel.Section>
        <DownloadSVGIcon {...props} />
        <DownloadIconImage {...props} />
        <CopySVGCode {...props} />
        <CopyImageURL {...props} />
      </ActionPanel.Section>
      <IconStorageActions props={props} showMovement={!args.detailView} />
    </ActionPanel>
  );
};

const ViewIcon = (props: IconProps): JSX.Element => {
  return (
    <Action.Push
      title="View Icon"
      target={<IconDetail {...props} />}
      icon={Icon.Layers}
      onPush={async () => await addRecentIcon(props.icon, props.refresh)}
    />
  );
};

const OpenInBrowser = (props: { icon: Icon8; refresh: () => void }): JSX.Element => {
  return (
    <Action.OpenInBrowser
      url={props.icon.link}
      icon={{ source: "../assets/Icons8-Open.png", tintColor: Color.PrimaryText }}
      onOpen={async () => await addRecentIcon(props.icon, props.refresh)}
    />
  );
};

const CopySVGCode = (props: IconActionProps): JSX.Element => {
  return (
    <Action
      title="Copy SVG Code"
      icon={Icon.Code}
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      onAction={async () => {
        let icon = props.icon;
        if (!icon.svg) {
          await showToast(Toast.Style.Animated, "Getting SVG Code...");
          icon = await getIconDetail(icon, props.options);
        }
        await Clipboard.copy(icon.svg);
        await showToast(Toast.Style.Success, "Copied SVG Code");
        await addRecentIcon(props.icon, props.refresh);
      }}
    />
  );
};

const CopyImageURL = (props: IconActionProps): JSX.Element => {
  return (
    <Action
      title="Copy Image URL"
      icon={Icon.Link}
      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
      onAction={async () => {
        await Clipboard.copy(getIconImageLink(props.icon, props.options));
        await showToast(Toast.Style.Success, "Copied Image URL");
        await addRecentIcon(props.icon, props.refresh);
      }}
    />
  );
};

const DownloadSVGIcon = (props: IconActionProps): JSX.Element => {
  return (
    <Action
      title="Download SVG Icon"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      onAction={async () => {
        await showToast(Toast.Style.Animated, "Downloading SVG Icon ...");
        let icon = props.icon;
        if (!icon.svg) {
          icon = await getIconDetail(props.icon, props.options);
        }
        if (icon.svg) {
          const filePath = `${props.options.path}/${icon.downloadName ? icon.downloadName : icon.name}.svg`;
          fs.writeFileSync(filePath, icon.svg);
          const options: Toast.Options = {
            style: Toast.Style.Success,
            title: "SVG Icon Downloaded",
            primaryAction: {
              title: "Open Icon",
              onAction: async (toast: Toast) => {
                await open(filePath);
                await toast.hide();
                await closeMainWindow();
              },
            },
            secondaryAction: {
              title: "Show In Finder",
              onAction: async (toast: Toast) => {
                await showInFinder(filePath);
                await toast.hide();
                await closeMainWindow();
              },
            },
          };
          await showToast(options);
          await addRecentIcon(props.icon, props.refresh);
        } else {
          await showToast(Toast.Style.Failure, "SVG Icon Download Failed");
        }
      }}
    />
  );
};

const DownloadIconImage = (props: IconActionProps): JSX.Element => {
  const format = props.options.format;
  const formatName = format.toUpperCase();

  return (
    <Action
      title={`Download ${formatName} Icon`}
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      onAction={async () => {
        await showToast(Toast.Style.Animated, `Downloading ${formatName} Icon ...`);
        const icon = props.icon;
        const filePath = `${props.options.path}/${icon.downloadName ? icon.downloadName : icon.name}.${format}`;
        const downloadLink = getIconImageLink(icon, props.options);
        try {
          const response = await fetch(downloadLink);
          const buffer = Buffer.from(await response.arrayBuffer());
          fs.writeFileSync(filePath, buffer);
          const options: Toast.Options = {
            style: Toast.Style.Success,
            title: `${formatName} Icon Downloaded`,
            primaryAction: {
              title: "Open Icon",
              onAction: async (toast: Toast) => {
                await open(filePath);
                await toast.hide();
                await closeMainWindow();
              },
            },
            secondaryAction: {
              title: "Show In Finder",
              onAction: async (toast: Toast) => {
                await showInFinder(filePath);
                await toast.hide();
                await closeMainWindow();
              },
            },
          };
          await showToast(options);
          await addRecentIcon(props.icon, props.refresh);
        } catch (error) {
          await showToast(Toast.Style.Failure, `${formatName} Icon Download Failed`);
          console.error(error);
        }
      }}
    />
  );
};
