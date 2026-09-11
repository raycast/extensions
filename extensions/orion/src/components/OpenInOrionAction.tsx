import { Action, closeMainWindow, Icon } from "@raycast/api";

import { closeLauncherTabs, openInOrion } from "../utils";

const OpenInOrionAction = (props: { url: string; title?: string }) => (
  <Action
    title={props.title ?? "Open in Orion"}
    icon={Icon.Globe}
    onAction={async () => {
      // Close launcher tabs before opening the result (which brings Orion to the
      // front); otherwise a lingering raycast:// tab re-fires the deeplink.
      await closeLauncherTabs();
      await openInOrion(props.url);
      await closeMainWindow({ clearRootSearch: true });
    }}
  />
);

export default OpenInOrionAction;
