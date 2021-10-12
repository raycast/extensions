import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { ReactElement, useState } from "react";
import { PackageSearchResult, usePackageSearch } from "./utils";

export default function Main(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { response, error, isLoading } = usePackageSearch(searchText);

  if (error) {
    showToast(ToastStyle.Failure, "Cannot search code", error);
  }

  return (
    <List
      searchBarPlaceholder="Search script commands by filename..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle
    >
      {response?.results?.map((r) => (
        <PackageListItem key={r.package.links.npm} result={r} />
      ))}
    </List>
  );
}

function PackageListItem(props: { result: PackageSearchResult }) {
  const npmPackage = props.result.package;
  return (
    <List.Item
      title={npmPackage.name}
      subtitle={npmPackage.description}
      accessoryTitle={npmPackage.publisher?.username}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInBrowserAction title="Open in Browser" url={npmPackage.links.npm} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyToClipboardAction
              title="Copy Install Command"
              content={`npm install ${npmPackage.name}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <CopyToClipboardAction
              title="Copy Package Name"
              content={npmPackage.links.npm}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <CopyToClipboardAction
              title="Copy Package URL"
              content={npmPackage.links.npm}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
