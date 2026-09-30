import { Action, closeMainWindow, Icon, PopToRootType } from "@raycast/api";

import { closeLauncherTabs, openInOrion } from "../utils";

// `immediatePopToRoot` is opt-in - see OpenTabAction for why only the Command
// Bar passes it, while the standalone Bookmarks/Reading List/History commands
// that also render this action keep respecting the user's own preference.
const OpenInOrionAction = (props: { url: string; title?: string; immediatePopToRoot?: boolean }) => (
  <Action
    title={props.title ?? "Open in Orion"}
    icon={Icon.Globe}
    onAction={async () => {
      // Close launcher tabs before opening the result (which brings Orion to the
      // front); otherwise a lingering raycast:// tab re-fires the deeplink.
      await closeLauncherTabs();
      await openInOrion(props.url);
      await closeMainWindow({
        clearRootSearch: true,
        ...(props.immediatePopToRoot ? { popToRootType: PopToRootType.Immediate } : {}),
      });
    }}
  />
);

export default OpenInOrionAction;
