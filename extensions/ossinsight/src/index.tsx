import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { languages, Repository } from "./types";
import fetch from "node-fetch";

const pref = getPreferenceValues<{ period: string }>();

export default function Command() {
  const [language, setLanguage] = useState<string>(languages[0]);
  const [loading, setLoading] = useState<boolean>(true);
  const [results, setResults] = useState<Repository[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const url = `https://api.ossinsight.io/q/trending-repos?language=${language}&period=${pref.period}`;
        console.log(url);
        const resp = await fetch(url);
        const { data } = (await resp.json()) as { data: Repository[] };
        setResults(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [language]);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search trending repositories..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Language"
          onChange={(newValue) => {
            setLanguage(newValue);
          }}
        >
          {languages.map((lang) => (
            <List.Dropdown.Item key={lang} title={lang} value={lang} />
          ))}
        </List.Dropdown>
      }
    >
      {results.map((repo, index) => (
        <List.Item
          key={repo.repo_id}
          title={{ value: `#${index + 1} ${repo.repo_name}`, tooltip: repo.description ?? "" }}
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
