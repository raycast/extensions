import { ActionPanel, Action, List, Color, Icon, Image } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { parseFetchTrendsResponse } from "./models/net";
import { githubTrendRanges } from "./models/stats";

const BASE_API =
  "https://raw.githubusercontent.com/flaming-codes/crane-stats/main/data/github/trends/users-by-followers";

type Hit = {
  original: {
    id: number;
    node_id: string;
    name: string;
    bio: string;
    login: string;
    avatar_url: string;
    html_url: string;
    followers: number;
    following: number;
    public_repos: number;
  };
  trend: {
    followers: number;
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
      <List.Section title="Trending R Maintainers by followers on GitHub">
        {data?.map((hit) => (
          <SearchListItem key={hit.original.id} hit={hit} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ hit }: { hit: Hit }) {
  const { original, trend } = hit;
  const followers = original.followers;
  const count = trend.followers;

  const color = count > 0 ? Color.Green : count < 0 ? Color.Red : Color.SecondaryText;
  const icon = count > 0 ? Icon.AddPerson : count < 0 ? Icon.RemovePerson : Icon.PersonLines;

  return (
    <List.Item
      title={original.name ?? original.login}
      subtitle={`with ${followers} ${followers === 1 ? "follower" : "followers"} and ${original.public_repos} ${
        original.public_repos === 1 ? "repo" : "repos"
      }`}
      icon={{
        source: original.avatar_url,
        mask: Image.Mask.Circle,
        tooltip: original.bio,
      }}
      accessories={[
        {
          icon: { tintColor: color, source: icon },
          text: { value: `${trend.followers}`, color },
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={original.html_url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
