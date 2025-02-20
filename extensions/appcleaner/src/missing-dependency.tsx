/* eslint-disable @raycast/prefer-title-case */
import { ActionPanel, Action, Detail } from "@raycast/api";

const AppCleanerURL = "https://freemacsoft.net/appcleaner/";
const PearCleanerURL = "https://itsalin.com/appInfo/?id=pearcleaner";

export function MissingDependency() {
  const error = `
# Missing Dependency!

You need either [AppCleaner](${AppCleanerURL}) or [PearCleaner](${PearCleanerURL}) installed.
`;

  return (
    <Detail
      markdown={error}
      navigationTitle="Error"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser icon="icon.png" title="Get AppCleaner" url={AppCleanerURL} />
          <Action.OpenInBrowser icon="pearcleaner.png" title="Get PearCleaner" url={PearCleanerURL} />
        </ActionPanel>
      }
    />
  );
}
