import { Action, Icon, closeMainWindow } from "@raycast/api";
import { executeJxa, safariAppIdentifier } from "../utils";

const openInNewWindow = async (url: string) =>
  executeJxa(`
      const safari = Application("${safariAppIdentifier}");
      const doc = safari.Document().make();
      doc.url = "${url}"
      safari.activate()
  `);

const OpenNewWindowAction = (props: { url: string }) => (
  <Action
    title="Open In New Window"
    icon={Icon.AppWindow}
    onAction={async () => {
      await closeMainWindow();
      await openInNewWindow(props.url);
    }}
  />
);

export default OpenNewWindowAction;
