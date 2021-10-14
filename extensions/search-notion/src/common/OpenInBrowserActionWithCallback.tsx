import { ActionPanelItem, OpenInBrowserActionProps, Icon } from "@raycast/api";
import { exec } from "child_process";

type Props = OpenInBrowserActionProps & {
  onOpen: (url: string) => void;
};

export const OpenInBrowserActionWithCallback = ({ icon, title, url, onOpen, ...props }: Props): JSX.Element => (
  <ActionPanelItem
    {...props}
    icon={icon || Icon.Globe}
    title={title || "Open In Browser"}
    onAction={() => {
      exec(`open "${url}"`);
      onOpen(url);
    }}
  />
);
