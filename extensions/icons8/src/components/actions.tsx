import {
  Action,
  ActionPanel,
  Toast,
  showToast,
  getPreferenceValues,
  Icon,
  Color,
  open,
  showInFinder,
  Clipboard
} from "@raycast/api";
import { IconStorageActions, appendRecentIcon } from "../utils/storage";
import { ConfigureAction } from "./configure-icon";
import { IconDetail } from "./icon-detail";
import { getIconDetail } from "../hooks/api";
import { IconProps } from "./icon";
import { Icon8, Preferences } from "../types/types";
import { homedir } from "os";
import fs from "fs";

const preferences: Preferences = getPreferenceValues();
const path: string = preferences.downloadPath;
export const downloadPath = path.includes(homedir()) ? path : `${homedir()}/${path.replace("~/", "")}`;

const addRecentIcon = async (icon: Icon8, refresh: () => void) => {
  await appendRecentIcon(icon);
  refresh();
};

export const IconActionPanel = (args: { props: IconProps; item?: boolean }): JSX.Element => {
  const props = args.props;
  const icon = props.icon;

  return (
    <ActionPanel>
      <OpenInBrowser icon={icon} refresh={props.refresh} />
      {args.item && <ViewIcon {...props} />}
      <ConfigureAction icon={icon} options={props.options} setOptions={props.setOptions} />
      <ActionPanel.Section>
        <DownloadSVGIcon {...props} />
        <DownloadIconImage {...props} />
        <CopySVGCode {...props} />
        <CopyImageURL icon={icon} refresh={props.refresh} />
      </ActionPanel.Section>
      <IconStorageActions props={props} showMovement={args.item} />
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

interface IconActionProps {
  icon: Icon8;
  options: any; 
  refresh: () => void;
}

const CopySVGCode = (props: IconActionProps): JSX.Element => {
  return (
    <Action
      title="Copy SVG Code"
      icon={Icon.Code}
      shortcut={{ modifiers: ["cmd"], key: "c" }}
      onAction={async () => {
        let icon = props.icon
        if (!icon.svg) {
          showToast(Toast.Style.Animated, "Getting SVG Code...");
          icon = await getIconDetail(icon, props.options.color); 
        }
        Clipboard.copy(icon.svg); 
        showToast(Toast.Style.Success, "Copied SVG Code");
        await addRecentIcon(props.icon, props.refresh);
      }}
    />
  );
};

const CopyImageURL = (props: { icon: Icon8; refresh: () => void }): JSX.Element => {
  return (
    <Action
      title="Copy Image URL"
      icon={Icon.Link}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      onAction={async () => {
        Clipboard.copy(props.icon.url); 
        showToast(Toast.Style.Success, "Copied Image URL");
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
        showToast(Toast.Style.Animated, "Downloading SVG Icon ...");
        let icon = props.icon; 
        if (!icon.svg) {
          icon = await getIconDetail(props.icon, props.options.color);
        }
        if (icon.svg) {
          const filePath = `${props.options.path}/${icon.downloadName ? icon.downloadName : icon.name}.svg`;
          fs.writeFileSync(filePath, icon.svg);
          const options: Toast.Options = {
            style: Toast.Style.Success,
            title: "SVG Icon Downloaded",
            primaryAction: {
              title: "Open Icon",
              onAction: (toast: Toast) => {
                open(filePath);
                toast.hide();
              },
            },
            secondaryAction: {
              title: "Show In Finder",
              onAction: (toast: Toast) => {
                showInFinder(filePath);
                toast.hide();
              },
            },
          };
          showToast(options);
          await addRecentIcon(props.icon, props.refresh);
        } else {
          showToast(Toast.Style.Failure, "SVG Icon Download Failed");
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
        showToast(Toast.Style.Animated, `Downloading ${formatName} Icon ...`);
        let icon = props.icon; 
        if (!icon.image) {
          icon = await getIconDetail(props.icon, props.options.color);
        }
        if (icon.image) {
          const filePath = `${props.options.path}/${icon.downloadName ? icon.downloadName : icon.name}.${format}`;
          const options: Toast.Options = {
            style: Toast.Style.Success,
            title: `${formatName} Icon Downloaded`,
            primaryAction: {
              title: "Open Icon",
              onAction: (toast) => {
                open(filePath);
                toast.hide();
              },
            },
            secondaryAction: {
              title: "Show In Finder",
              onAction: (toast) => {
                showInFinder(filePath);
                toast.hide();
              },
            },
          };
          showToast(options);
          await addRecentIcon(props.icon, props.refresh);
        } else {
          showToast(Toast.Style.Failure, `${formatName} Icon Download Failed`);
        }
      }}
    />
  );
};
