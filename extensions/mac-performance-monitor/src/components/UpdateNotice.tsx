/**
 * Full-screen message shown when the installed Mac Performance Monitor is older than
 * the first release the extension works with. Pressing Enter opens the releases page.
 */

import { Action, ActionPanel, Detail } from "@raycast/api";
import { MINIMUM_APP_VERSION, RELEASES_URL } from "../data/appVersion";
import { OpenMonitorAction } from "./Actions";

interface UpdateNoticeProps {
  installedVersion: string;
}

export function UpdateNotice(props: UpdateNoticeProps) {
  const markdown =
    "## Update Mac Performance Monitor\n\n" +
    "Version " +
    props.installedVersion +
    " is installed. This extension needs version " +
    MINIMUM_APP_VERSION +
    " or later.";

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Releases Page" url={RELEASES_URL} />
          <OpenMonitorAction />
        </ActionPanel>
      }
    />
  );
}
