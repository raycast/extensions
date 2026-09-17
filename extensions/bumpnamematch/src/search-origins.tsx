import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { OriginNames } from "./origin-names";
import { GenderDropdown, type GenderFilter } from "./gender-dropdown";
import { getPrefs } from "./lib/prefs";
import { useFavoriteLists } from "./lib/use-favorite-lists";
import { originFlag } from "./lib/origin-flags";

interface OriginsResponse {
  origins: string[];
}

export default function Command() {
  const { baseUrl, apiKey } = getPrefs();
  const [gender, setGender] = useState<GenderFilter>("");

  const { data, isLoading } = useFetch<OriginsResponse>(`${baseUrl}/api/origins`);
  const origins = data?.origins ?? [];
  const lists = useFavoriteLists(baseUrl, apiKey);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search origins…"
      searchBarAccessory={<GenderDropdown value={gender} onChange={setGender} />}
    >
      {origins.map((origin) => (
        <List.Item
          key={origin}
          title={origin}
          icon={originFlag(origin) ?? Icon.Globe}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Names"
                icon={Icon.ChevronRight}
                target={
                  <OriginNames origin={origin} initialGender={gender} baseUrl={baseUrl} apiKey={apiKey} lists={lists} />
                }
              />
              <Action.OpenInBrowser
                title="Open in Browser"
                url={`${baseUrl}/names/${encodeURIComponent(origin.toLowerCase())}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
