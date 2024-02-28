import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { useState } from "react";
import { languages, Repository } from "./types";
import { getIcon } from "./utils";
import { useFetch } from "@raycast/utils";

const pref = getPreferenceValues<{ period: string }>();

export default function Command() {
  const [language, setLanguage] = useState<string>("All");
  const { isLoading, data } = useFetch<Repository[]>(
    `https://api.ossinsight.io/q/trending-repos?language=${language}&period=${pref.period}`,
    {
      parseResponse: async (response: Response) => {
        if (!response.ok) {
          throw new Error("No data available...");
        }

        const { data } = (await response.json()) as { data: Repository[] };
        return data as Repository[];
      },
    }
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search trending repositories..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Language"
          onChange={(newValue) => {
            setLanguage(newValue);
          }}
        >
          {Object.entries(languages).map(([key, value], index) => (
            <List.Dropdown.Item key={index} title={key} value={value} />
          ))}
        </List.Dropdown>
      }
    >
      {data &&
        data.map((repo, index) => (
          <List.Item
            key={repo.repo_id}
            icon={getIcon(index + 1)}
            title={{ value: repo.repo_name, tooltip: repo.description ?? "" }}
            subtitle={repo.language ?? ""}
            accessories={[
              {
                icon: Icon.Star,
                text: repo.stars + "",
                tooltip: "Stars",
              },
              {
                icon: Icon.Shuffle,
                text: repo.forks + "",
                tooltip: "Forks",
              },
              {
                icon: Icon.ArrowUpCircle,
                text: repo.pushes ? repo.pushes + "" : "0",
                tooltip: "Pushes",
              },
              {
                icon: Icon.CodeBlock,
                text: repo.pull_requests ? repo.pull_requests + "" : "0",
                tooltip: "PRs",
              },
              {
                icon: Icon.TwoPeople,
                text: repo.contributor_logins ? repo.contributor_logins.split(",").length + "" : "0",
                tooltip:
                  "Top Contributors" + (repo.contributor_logins ? `: ${repo.contributor_logins.slice(0, -1)}` : ""),
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser url={`https://ossinsight.io/analyze/${repo.repo_name}`} />
                  <Action.OpenInBrowser title="Open Repository" url={`https://github.com/${repo.repo_name}`} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy SSH Clone Command"
                    content={`git clone git@github.com:${repo.repo_name}.git`}
                  />
                  <Action.CopyToClipboard
                    title="Copy HTTP Clone Command"
                    content={`git clone https://github.com/${repo.repo_name}.git`}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
