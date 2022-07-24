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
        <DownloadSVGIcon icon={icon} color={props.options.color} refresh={props.refresh} />
        <DownloadIconImage icon={icon} {...props.options} />
        <CopySVGCode icon={icon} refresh={props.refresh} />
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

const CopySVGCode = (props: { icon: Icon8; refresh: () => void }): JSX.Element => {
  return (
    <Action.CopyToClipboard
      title="Copy SVG Code"
      content={props.icon.svg}
      icon={Icon.Code}
      shortcut={{ modifiers: ["cmd"], key: "c" }}
      onCopy={async () => {
        showToast(Toast.Style.Success, "Copied SVG Code");
        await addRecentIcon(props.icon, props.refresh);
      }}
    />
  );
};

const CopyImageURL = (props: { icon: Icon8; refresh: () => void }): JSX.Element => {
  return (
    <Action.CopyToClipboard
      title="Copy Image URL"
      content={props.icon.url}
      icon={Icon.Link}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      onCopy={async () => {
        showToast(Toast.Style.Success, "Copied Image URL");
        await addRecentIcon(props.icon, props.refresh);
      }}
    />
  );
};

const DownloadSVGIcon = (props: { icon: Icon8; color: string; refresh: () => void }): JSX.Element => {
  return (
    <Action
      title="Download SVG Icon"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      onAction={async () => {
        showToast(Toast.Style.Animated, "Downloading SVG Icon ...");
        const icon: Icon8 | undefined = await getIconDetail(props.icon, props.color);
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
          await addRecentIcon(props.icon, props.refresh);
        } else {
          showToast(Toast.Style.Failure, "SVG Icon Download Failed");
        }
      }}
    />
  );
};

interface DownloadImageProps {
  icon: Icon8;
  color: string;
  size: number;
  format: string;
  refresh: () => void;
}

const DownloadIconImage = (props: DownloadImageProps): JSX.Element => {
  const format = props.format;
  const formatName = format.toUpperCase();

  return (
    <Action
      title={`Download ${formatName} Icon`}
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      onAction={async () => {
        showToast(Toast.Style.Animated, `Downloading ${formatName} Icon ...`);
        const icon: Icon8 | undefined = await getIconDetail(props.icon, props.color);
        if (icon && icon.image) {
          const filePath = `${downloadPath}/${icon.name}.${format}`;
          console.log(icon.image);
          fs.writeFileSync(filePath, icon.image);
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
