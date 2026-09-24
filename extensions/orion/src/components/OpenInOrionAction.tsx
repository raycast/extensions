import { Action, closeMainWindow, Icon, PopToRootType } from "@raycast/api";

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
      // See OpenTabAction for why this forces an immediate pop to root instead
      // of following the user's Pop to Root Search preference.
      await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    }}
  />
);

export default OpenInOrionAction;
