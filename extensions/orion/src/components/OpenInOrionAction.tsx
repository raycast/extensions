import { Action, closeMainWindow, Icon } from "@raycast/api";

import { openInOrion } from "../utils";

const OpenInOrionAction = (props: { url: string; title?: string }) => (
  <Action
    title={props.title ?? "Open in Orion"}
    icon={Icon.Globe}
    onAction={async () => {
      await openInOrion(props.url);
      await closeMainWindow({ clearRootSearch: true });
    }}
  />
);

export default OpenInOrionAction;
