import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import React, { useState } from "react";
import { useSearchPackages } from "./api";
import { OrganizationDropdown } from "./components/dropdowns/organization-dropdown";
import { Package } from "./zod";

export default function Command() {
  const preferences = getPreferenceValues();
  const url = preferences.url;

  const [owner, setOwner] = useState(preferences.organization);

  const { data, isLoading } = useSearchPackages({
    owner,
  });

  type WithVersions = Package & { versions: Package[] };

  const grouped = Object.values(
    data?.reduce((carry: Record<string, WithVersions>, item: Package) => {
      if (typeof carry[item.name] === "undefined") {
        carry[item.name] = { ...item, versions: [] };
      }

      carry[item.name].versions = [...carry[item.name].versions, item];

      return carry;
    }, {}) || {},
  );

  return (
    <List
      searchBarPlaceholder="Search for packages"
      isShowingDetail
      searchBarAccessory={<OrganizationDropdown value={owner} onChange={(org) => setOwner(org)} />}
      isLoading={isLoading}
    >
      {grouped.map((item) => (
        <List.Item
          key={item.id}
          title={item.name}
          subtitle={item.version}
          accessories={[{ text: item.type }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open" url={item.html_url} />
              {item.repository && (
                <Action.OpenInBrowser title="Open Repository" url={`${url}/${item.repository.full_name}`} />
              )}
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Type" text={item.type} />
                  {item.repository && (
                    <List.Item.Detail.Metadata.Link
                      title="Repository"
                      text={item.repository.full_name}
                      target={item.repository.html_url}
                    />
                  )}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Versions" />
                  {item.versions.map((item) => {
                    return (
                      <List.Item.Detail.Metadata.Link
                        key={item.id}
                        title={item.created_at}
                        target={item.html_url}
                        text={item.version.substring(0, 12)}
                      />
                    );
                  })}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
