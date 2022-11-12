import { usePromise } from "@raycast/utils";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { XcodeService } from "../../services/xcode.service";

/**
 * Xcode Installation Verifier
 */
export function XcodeInstallationVerifier<Content>(props: { children: Content }) {
  const isXcodeInstalled = usePromise(XcodeService.isXcodeInstalled, [], {
    onError: () => Promise.resolve(),
  });
  return isXcodeInstalled.data === false ? (
    <List searchBarPlaceholder="Xcode is not installed">
      <List.EmptyView
        icon="download-xcode.png"
        title="Xcode is not installed"
        description="Please install Xcode to continue using this command."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser icon={Icon.Download} title="Download Xcode" url={XcodeService.downloadUrl} />
          </ActionPanel>
        }
      />
    </List>
  ) : (
    props.children
  );
}
