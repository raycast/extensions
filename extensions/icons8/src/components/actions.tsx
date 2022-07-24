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
} from "@raycast/api";
import { IconStorageActions, appendRecentIcon } from "../utils/storage";
import { IconDetail } from "./icon-detail";
import { getIconDetail } from "../hooks/api";
import { IconProps } from "./icon";
import { Icon8, Preferences } from "../types/types";
import { homedir } from "os";
import fs from "fs";

const preferences: Preferences = getPreferenceValues();
const path: string = preferences.downloadPath;
const downloadPath = path.includes(homedir()) ? path : `${homedir()}/${path.replace("~/", "")}`;

export const IconActionPanel = (props: IconProps): JSX.Element => {
  const icon = props.icon; 

  return (
    <ActionPanel>
      <OpenInBrowser icon={icon} />
      <ViewIcon icon={icon} />
      <ActionPanel.Section>
        <DownloadSVGIcon icon={icon} />
        <DownloadPNGIcon icon={icon} />
        <CopySVGCode icon={icon} />
        <CopyImageURL icon={icon} />
      </ActionPanel.Section>
      <IconStorageActions {...props} />
    </ActionPanel>
  );
};

const ViewIcon = (props: { icon: Icon8 }): JSX.Element => {
  return (
    <Action.Push
      title="View Icon"
      target={<IconDetail {...props} />}
      icon={{ source: props.icon.url, tintColor: props.icon.color ? null : Color.PrimaryText }}
      onPush={async () => {
        await appendRecentIcon(props.icon);
      }}
    />
  );
};

const OpenInBrowser = (props: { icon: Icon8 }): JSX.Element => {
  return (
    <Action.OpenInBrowser
      url={props.icon.link}
      icon={{ source: "../assets/Icons8-Open.png", tintColor: Color.PrimaryText }}
      onOpen={async () => {
        await appendRecentIcon(props.icon);
      }}
    />
  );
};

const CopySVGCode = (props: { icon: Icon8 }): JSX.Element => {
  return (
    <Action.CopyToClipboard
      title="Copy SVG Code"
      content={props.icon.svg}
      icon={Icon.Code}
      shortcut={{ modifiers: ["cmd"], key: "c" }}
      onCopy={async () => {
        showToast(Toast.Style.Success, "Copied SVG Code");
        await appendRecentIcon(props.icon);
      }}
    />
  );
};

const CopyImageURL = (props: { icon: Icon8 }): JSX.Element => {
  return (
    <Action.CopyToClipboard
      title="Copy Image URL"
      content={props.icon.url}
      icon={Icon.Link}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      onCopy={async () => {
        showToast(Toast.Style.Success, "Copied Image URL");
        await appendRecentIcon(props.icon);
      }}
    />
  );
};

const DownloadSVGIcon = (props: { icon: Icon8 }): JSX.Element => {
  return (
    <Action
      title="Download SVG Icon"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      onAction={async () => {
        showToast(Toast.Style.Animated, "Downloading SVG Icon ...");
        const icon: Icon8 | undefined = await getIconDetail(props.icon);
        if (icon) {
          const filePath = `${downloadPath}/${icon.name}.svg`;
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
          await appendRecentIcon(props.icon);
        } else {
          showToast(Toast.Style.Failure, "SVG Icon Download Failed");
        }
      }}
    />
  );
};

const DownloadPNGIcon = (props: { icon: Icon8 }): JSX.Element => {
  return (
    <Action
      title="Download PNG Icon"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      onAction={async () => {
        showToast(Toast.Style.Animated, "Downloading PNG Icon ...");
        const icon: Icon8 | undefined = await getIconDetail(props.icon);
        if (icon && icon.png) {
          const filePath = `${downloadPath}/${icon.name}.png`;
          console.log(icon.png);
          fs.writeFileSync(filePath, icon.png);
          const options: Toast.Options = {
            style: Toast.Style.Success,
            title: "PNG Icon Downloaded",
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
          await appendRecentIcon(props.icon);
        } else {
          showToast(Toast.Style.Failure, "PNG Icon Download Failed");
        }
      }}
    />
  );
};
