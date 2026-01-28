import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { Package } from ".././types";
import { coerce, compare } from "semver";

interface Props {
  searchResult: Package;
}

export const PackageVersions = ({ searchResult }: Props): JSX.Element => {
  return (
    <List navigationTitle="Versions" searchBarPlaceholder="Filter versions...">
      <List.Section title={searchResult.name} subtitle={searchResult.platform}>
        {searchResult.versions
          .sort((versionA, versionB) =>
            compare(
              coerce(versionA.number)?.version || versionA.number,
              coerce(versionB.number)?.version || versionB.number
            )
          )
          .map((version) => (
            <List.Item
              key={version.number}
              title={version.number}
              icon={Icon.Tag}
              accessories={[
                {
                  icon: Icon.BlankDocument,
                  text: version.spdx_expression,
                  tooltip: "License",
                },
                {
                  icon: Icon.Calendar,
                  date: new Date(version.published_at),
                  tooltip: `Published: ${new Date(version.published_at).toLocaleDateString()}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content={version.number}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                    title="Copy Version Number"
                  />
                </ActionPanel>
              }
            />
          ))
          .reverse()}
      </List.Section>
    </List>
  );
};
