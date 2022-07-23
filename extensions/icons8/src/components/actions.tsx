import { Action, Toast, showToast, getPreferenceValues, Icon, open, showInFinder } from "@raycast/api";
import { getIconDetail } from "../hooks/api";
import { Icon8, Preferences } from "../types/types";
import { homedir } from "os";
import fs from "fs";

const preferences: Preferences = getPreferenceValues();
const path: string = preferences.downloadPath;
const downloadPath = path.includes(homedir()) ? path : `${homedir()}/${path.replace("~/", "")}`;

export const DownloadSVGIcon = (props: { icon: Icon8 }): JSX.Element => {
  return (
    <Action
      title="Download SVG Icon"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      onAction={() => {
        showToast(Toast.Style.Animated, "Downloading SVG Icon ...");
        setTimeout(async () => {
          const icon: Icon8 | undefined = await getIconDetail(props.icon);
          if (icon) {
            const filePath: string = `${downloadPath}/${icon.name}.svg`;
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
          } else {
            showToast(Toast.Style.Failure, "SVG Icon Download Failed");
          }
        }, 2000);
      }}
    />
  );
};

export const DownloadPNGIcon = (props: { icon: Icon8 }): JSX.Element => {
  return (
    <Action
      title="Download PNG Icon"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      onAction={() => {
        showToast(Toast.Style.Animated, "Downloading PNG Icon ...");
        setTimeout(async () => {
          const icon: Icon8 | undefined = await getIconDetail(props.icon);
          if (icon && icon.png) {
            const filePath = `${downloadPath}/${icon.name}.png`;
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
          } else {
            showToast(Toast.Style.Failure, "PNG Icon Download Failed");
          }
        }, 2000);
      }}
    />
  );
};
