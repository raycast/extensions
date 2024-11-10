import { Action, ActionPanel, Icon, List } from "@raycast/api";
import DocsList from "./DocsList";
import { Package } from "../types";

type PackageListItemProps = {
  pkg: Package;
  refreshAction: JSX.Element;
};

export default function PackageListItem({ pkg, refreshAction }: PackageListItemProps) {
  return (
    <List.Item
      key={pkg.id}
      title={pkg.name}
      subtitle={pkg.description}
      keywords={keywords(pkg.description)}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Package"
            icon={Icon.AppWindowSidebarLeft}
            target={<DocsList packageName={pkg.name} url={pkg.docs_url} />}
          />
          <Action.OpenInBrowser title="Open in Browser" url={pkg.docs_url} />
          <Action.CopyToClipboard
            title="Copy Link"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            content={pkg.docs_url}
          />
          <ActionPanel.Section>{refreshAction}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function keywords(description: string) {
  return description.split(" ").map((word) => word.toLowerCase());
}
