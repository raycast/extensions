import { ActionPanel, Action, List, Color, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { parseFetchTrendsResponse } from "./models/net";
import { githubTrendRanges } from "./models/stats";

const BASE_PACKAGE = "https://www.cran-e.com/package";
const BASE_SITE = "https://www.cran-e.com/statistic/github/repos-by-stars";
const BASE_API = "https://raw.githubusercontent.com/flaming-codes/crane-stats/main/data/github/trends/repos-by-stars";

type Hit = {
  original: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    description: string;
    stargazers_count: number;
    watchers: number;
    owner: {
      login: string;
      avatar_url: string;
    };
  };
  trend: {
    stargazers_count: number;
  };
  crane: {
    packageSlug: string;
  };
};

function DropdownList(props: { selected: string; onValueChange: (next: string) => void }) {
  const { selected, onValueChange } = props;

  return (
    <List.Dropdown value={selected} tooltip="Select Time Range" onChange={onValueChange}>
      <List.Dropdown.Section>
        {githubTrendRanges.map((range) => (
          <List.Dropdown.Item key={range} title={range} value={range} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const [range, setRange] = useState<string>(githubTrendRanges[0]);
  const { data, isLoading } = useFetch(`${BASE_API}/${range}.json`, {
    parseResponse: (res) => parseFetchTrendsResponse<Hit>(res),
  });

  return (
    <List
      throttle
      isLoading={isLoading}
      searchBarAccessory={<DropdownList selected={range} onValueChange={setRange} />}
    >
      <List.Section title="Trending R Packages on GitHub">
        {data?.map((hit) => (
          <SearchListItem key={hit.original.id} hit={hit} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ hit }: { hit: Hit }) {
  const { original, trend, crane } = hit;
  const count = trend.stargazers_count;

  const color = count > 0 ? Color.Green : count < 0 ? Color.Red : Color.SecondaryText;
  // count > 0 ? Icon.ArrowUp : count < 0 ? Icon.ArrowDown : Icon.Dot

  return (
    <List.Item
      title={original.name}
      subtitle={`by ${original.owner.login}`}
      accessories={[
        {
          icon: { tintColor: color, source: Icon.Star },
          text: { value: `${trend.stargazers_count}`, color },
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action.OpenInBrowser title="Show on Github" url={original.html_url} />
          </ActionPanel.Section>
          {crane.packageSlug && (
            <ActionPanel.Section>
              <Action.OpenInBrowser
                title="Show on CRAN/E"
                url={`${BASE_PACKAGE}/${crane.packageSlug}`}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
