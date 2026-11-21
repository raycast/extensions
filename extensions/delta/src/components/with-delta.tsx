import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ComponentType, ReactElement, useState } from "react";
import { DELTA_DOWNLOAD_URL, findDeltaCli, isDeltaRemembered } from "../lib/delta";

const NOT_INSTALLED_MARKDOWN = `## Delta Is Not Installed

This extension controls the Delta desktop app. Install Delta, then run this command again.`;

/**
 * Renders the command only when the Delta app is installed, otherwise explains how to get it.
 * Once Delta has been found, later launches render the command on the first frame. Until then
 * `loadingView` is shown; it should match the command's root view so Raycast doesn't flash a
 * different layout.
 */
export function withDelta<P extends object>(Component: ComponentType<P>, loadingView: ReactElement) {
  return function WithDelta(props: P) {
    const [isRemembered] = useState(isDeltaRemembered);
    const { data: cliPath, isLoading } = usePromise(findDeltaCli, [], { execute: !isRemembered });

    if (isRemembered || cliPath) {
      return <Component {...props} />;
    }
    if (isLoading) {
      return loadingView;
    }
    return (
      <Detail
        markdown={NOT_INSTALLED_MARKDOWN}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Download Delta" icon={Icon.Download} url={DELTA_DOWNLOAD_URL} />
          </ActionPanel>
        }
      />
    );
  };
}
