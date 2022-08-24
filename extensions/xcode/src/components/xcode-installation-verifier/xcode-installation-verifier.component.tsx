import { useCachedPromise } from "@raycast/utils";
import { Action, ActionPanel, getApplications, Icon, List } from "@raycast/api";
import { XcodeService } from "../../services/xcode.service";

/**
 * Xcode Installation Verifier
 */
export function XcodeInstallationVerifier<Content>(props: { children: Content }) {
  const applications = useCachedPromise(getApplications);
  const isXcodeInstalled = applications.data?.find(
    (application) => application.bundleId === XcodeService.bundleIdentifier
  );
  return !applications.data || isXcodeInstalled ? (
    props.children
  ) : (
    <List searchBarPlaceholder="Xcode is not installed">
      <List.EmptyView
        icon="download-xcode.png"
        title="Xcode is not installed"
        description="Please install Xcode to continue using this command."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              icon={Icon.Download}
              title="Download Xcode"
              url="https://apps.apple.com/app/id497799835"
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
