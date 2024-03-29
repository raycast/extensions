import toSemver from "to-semver";
import { ActionPanel, List, Action, Icon } from "@raycast/api";

type Versions = {
  versions: Record<string, string>;
  slug: string;
};

export function Versions({ versions, slug }: Versions) {
  const versionNum = Object.keys(versions);
  //! This may not always be accurate because some plugins as weird versions e.g. 1.10.0.1
  const sortedVersionNum = toSemver(versionNum);

  return (
    <List searchBarPlaceholder="Search for a version" navigationTitle="Search Versions">
      {versions &&
        sortedVersionNum.map((version, index) => {
          return (
            <List.Item
              key={index}
              title={version}
              actions={
                <ActionPanel title="Plugin Version">
                  <Action.OpenInBrowser url={versions[version]} title="Download Version" icon={Icon.Download} />
                  <Action.CopyToClipboard
                    content={`"wpackagist-plugin/${slug}":"${version}"`}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                    title="Copy Composer Package Entry"
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
