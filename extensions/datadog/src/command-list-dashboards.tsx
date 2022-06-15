import { ActionPanel, List, OpenInBrowserAction, Icon } from "@raycast/api";
import { linkDomain } from "./util";
import { useState } from "react";
import {useDashboards} from "./useDashboards";

export interface Author {
  handle: string;
  name: string;
}

export default function CommandListDashboards() {
  const [query, setQuery] = useState("");
  const {dashboards, totalDashboards, dashboardsAreLoading} = useDashboards(query);

  return (
    <List isLoading={dashboardsAreLoading} onSearchTextChange={setQuery} throttle>
      <List.Section title={`Available dashboards ${totalDashboards}`}>
        {dashboards.map(dashboard => (
          <List.Item
            key={dashboard.id}
            icon={dashboard.is_favorite ? Icon.Star : undefined}
            title={dashboard.title || "No title"}
            accessories={[
              { icon: dashboard.is_shared ? Icon.Link : "", tooltip: "Shared" },
              { icon: Icon.Person, tooltip: dashboard.author.handle },
              {
                text: `${Array(dashboard.popularity + 1).join("I")}${Array(6 - dashboard.popularity).join(" ")}`,
                icon: Icon.Eye,
                tooltip: `Popularity ${dashboard.popularity}/5`,
              },
            ].filter(x => x.icon)}
            actions={
              <ActionPanel>
                <OpenInBrowserAction url={`https://${linkDomain()}${dashboard.url}`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
