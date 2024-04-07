import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCallback, useState } from "react";
import { useSearch } from "./brandfetch.api";
import { debounce } from "./utils";

export default function Command() {
  const [query, setQuery] = useState("");

  const { data, isLoading } = useSearch(query);

  const validQuery = query?.length >= 3;

  const onChange = useCallback(
    debounce((q: string) => {
      setQuery(q);
    }, 400),
    [],
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={(text) => {
        onChange(text);
      }}
    >
      {validQuery &&
        !isLoading &&
        data?.map((brand) => (
          <List.Item
            key={brand.brandId}
            title={brand.name || brand.domain}
            subtitle={brand.domain}
            icon={brand.icon || Icon.Warning}
            accessories={[{ icon: Icon.ChevronRightSmall }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://brandfetch.com/${brand.domain}`} />
              </ActionPanel>
            }
          />
        ))}
      {!validQuery && (
        <List.EmptyView
          title="Logos provided by Brandfetch"
          description="Search for a brand to see its logo or click enter to visit Brandfetch."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://brandfetch.com`} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
