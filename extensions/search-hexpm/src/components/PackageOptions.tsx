import { Icon, PushAction, List, ActionPanel, OpenInBrowserAction, CopyToClipboardAction } from "@raycast/api";
import type { HexSearchResult } from "../hex/types";
import { PackageInfo } from "./PackageInfo";

interface Props {
  item: HexSearchResult;
}

const packageManagers = ["mix.exs", "rebar.config", "erlang.mk"];

export const PackageOptions = ({ item }: Props): JSX.Element => {
  return (
    <List navigationTitle={`Search Hex > ${item.name}`}>
      <List.Section title="Actions">
        <List.Item
          key="package-name"
          icon={Icon.ArrowRight}
          title="Show details"
          accessoryTitle="Dependencies and more"
          actions={
            <ActionPanel>
              <PushAction
                title="Show Details"
                icon={Icon.TextDocument}
                target={<PackageInfo key={`${item}`} item={item} />}
              />
            </ActionPanel>
          }
        />
        {packageManagers.map((packageManager) => {
          if (item.configs[packageManager]) {
            const dependencyString = item.configs[packageManager];
            return (
              <List.Item
                key={packageManager}
                icon={Icon.Clipboard}
                title={`Copy ${packageManager} String`}
                accessoryTitle={dependencyString}
                actions={
                  <ActionPanel>
                    <CopyToClipboardAction content={dependencyString} />
                  </ActionPanel>
                }
              />
            );
          } else {
            return null;
          }
        })}
      </List.Section>
      <List.Section title="Links">
        {Object.entries(item.meta.links).map(([site, url]) => {
          return (
            <List.Item
              title={`Open ${site}`}
              accessoryTitle={`${url}`}
              key={site}
              icon={Icon.Globe}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction title="Open" url={`${url}`} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
};
