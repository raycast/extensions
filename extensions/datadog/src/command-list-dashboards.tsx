import { ActionPanel, List, Icon, Action, Color } from "@raycast/api";
import { linkDomain } from "./util";
import { useState } from "react";
import { useDashboards } from "./useDashboards";

// noinspection JSUnusedGlobalSymbols
export default function CommandListDashboards() {
  const [query, setQuery] = useState("");
  const { dashboards, totalDashboards, dashboardsAreLoading } = useDashboards(query);

  return (
    <List isLoading={dashboardsAreLoading} onSearchTextChange={setQuery} throttle>
      <List.Section title={`Available dashboards ${totalDashboards}`}>
        {dashboards.map(({ id, is_favorite, title, author, is_shared, popularity, url }) => (
          <List.Item
            key={id}
            icon={{ source: Icon.Star, tintColor: is_favorite ? Color.Yellow : Color.SecondaryText }}
            title={title || "No title"}
            accessories={[
              { icon: is_shared ? Icon.Link : "", tooltip: "Shared" },
              { icon: Icon.Person, tooltip: author.handle },
              {
                text: `${Array(popularity + 1).join("I")}${Array(6 - popularity).join(" ")}`,
                icon: Icon.Eye,
                tooltip: `Popularity ${popularity}/5`,
              },
            ].filter(x => x.icon)}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://${linkDomain()}${url}`} />
                <Action.CopyToClipboard content={`https://${linkDomain()}${url}`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
