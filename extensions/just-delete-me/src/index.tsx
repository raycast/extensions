import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type Site = {
  name: string;
  difficulty: string;
  domains: string[];
  notes: string;
  url: string;
};

function ucfirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function Command() {
  const { isLoading, data } = useFetch<string>(
    "https://raw.githubusercontent.com/jdm-contrib/jdm/master/_data/sites.json"
  );
  const sites: Array<Site> = data === undefined ? [] : JSON.parse(data);
  const difficultyColors = {
    easy: "#00FF00",
    medium: "#FFFF00",
    hard: "#FFA500",
    impossible: "#FF0000",
  } as { [key: string]: string };

  return (
    <List isLoading={isLoading} throttle>
      {sites.map((site: Site, index: number) => (
        <List.Item
          key={index}
          title={site.name}
          subtitle={ucfirst(site.difficulty)}
          icon={{ source: Icon.Info, tintColor: difficultyColors[site.difficulty] }}
          keywords={site.domains}
          accessories={[{ text: site.domains[0] }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                target={
                  <Detail
                    markdown={site.notes || "No notes available."}
                    actions={
                      <ActionPanel>
                        <Action.OpenInBrowser title="Go to site" url={site.url} />
                      </ActionPanel>
                    }
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
