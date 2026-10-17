import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ReactElement } from "react";
import { PackageDetail } from "./PackageDetail";
import { Package } from "../types";

interface PackageListItemProps {
  pkg: Package;
}
export const PackageListItem = ({ pkg }: PackageListItemProps): ReactElement => {
  const accessories: List.Item.Accessory[] = [
    {
      text: `v${pkg.version}`,
      tooltip: `Latest version`,
    },
  ];

  return (
    <List.Item
      id={pkg.name}
      key={pkg.name}
      title={pkg.name}
      subtitle={pkg.description}
      icon={Icon.Box}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Details">
            <Action.Push
              title="View Details"
              target={<PackageDetail name={pkg.name} version={pkg.version} />}
              icon={Icon.Info}
            />
            <Action.OpenInBrowser
              url={`https://pypi.org/project/${pkg.name}/`}
              title="Open Homepage"
              icon={Icon.Globe}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Install Command"
              content={`pip install ${pkg.name}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard title="Copy Package Name" content={pkg.name} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
