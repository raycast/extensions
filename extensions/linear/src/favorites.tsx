import { ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { format } from "date-fns";
import { ComponentProps } from "react";

import { getFavorites } from "./api/favorites";
import OpenInLinear from "./components/OpenInLinear";
import View from "./components/View";
import { formatCycle } from "./helpers/cycles";
import { getIcon } from "./helpers/icons";
import { getProjectIcon } from "./helpers/projects";
import { getStatusIcon } from "./helpers/states";
import { getUserIcon } from "./helpers/users";

function Favorites() {
  const { data, isLoading } = useCachedPromise(getFavorites);

  const favorites = data?.favorites ?? [];
  const urlKey = data?.organization?.urlKey;

  const baseLinearUrl = `https://linear.app/${urlKey}`;

  return (
    <List isLoading={isLoading}>
      {favorites.map(({ id, type, customView, cycle, document, issue, label, project, roadmap, user, updatedAt }) => {
        let props: Pick<List.Item.Props, "icon" | "title"> | null = null;
        let openInLinearProps: ComponentProps<typeof OpenInLinear> | null = null;

        if (type === "customView" && customView) {
          props = {
            icon: getIcon({ icon: customView.icon, color: customView.color, fallbackIcon: Icon.Layers }),
            title: customView.name,
          };

          openInLinearProps = {
            title: "Open View",
            url: baseLinearUrl + `/view/${customView.id}`,
          };
        }

        if (type === "cycle" && cycle) {
          const formattedCycle = formatCycle(cycle);
          props = {
            icon: { source: formattedCycle.icon },
            title: formattedCycle.title,
          };

          openInLinearProps = {
            title: "Open Cycle",
            url: baseLinearUrl + `/team/${cycle.team.key}/cycle/${cycle.number}`,
          };
        }

        if (type === "document" && document) {
          props = {
            icon: { source: Icon.Document, tintColor: document.color },
            title: document.title,
          };

          openInLinearProps = {
            title: "Open Document",
            url: baseLinearUrl + `/document/${document.id}`,
          };
        }

        if (type === "issue" && issue) {
          props = {
            icon: getStatusIcon(issue.state),
            title: issue.title,
          };

          openInLinearProps = {
            title: "Open Issue",
            url: issue.url,
          };
        }

        if (type === "label" && label) {
          props = {
            icon: { source: Icon.Dot, tintColor: label.color },
            title: label.name,
          };

          openInLinearProps = {
            title: "Open Label",
            url: baseLinearUrl + `/team/${label.team.key}/label/${label.name}`,
          };
        }

        if (type === "project" && project) {
          props = {
            icon: getProjectIcon(project),
            title: project.name,
          };

          openInLinearProps = {
            title: "Open Project",
            url: project.url,
          };
        }

        if (type === "roadmap" && roadmap) {
          props = {
            icon: { source: Icon.Map, tintColor: roadmap.color },
            title: roadmap.name,
          };

          openInLinearProps = {
            title: "Open Roadmap",
            url: baseLinearUrl + `/roadmap/${roadmap.id}`,
          };
        }

        if (type === "user" && user) {
          props = {
            icon: getUserIcon(user),
            title: user.name,
          };

          openInLinearProps = {
            title: "Open User",
            url: user.url,
          };
        }

        if (props) {
          const updated = new Date(updatedAt);
          return (
            <List.Item
              key={id}
              {...props}
              {...(openInLinearProps
                ? {
                    actions: (
                      <ActionPanel>
                        <OpenInLinear {...openInLinearProps} />
                      </ActionPanel>
                    ),
                  }
                : {})}
              accessories={[
                {
                  date: updated,
                  tooltip: `Updated: ${format(updated, "EEEE d MMMM yyyy 'at' HH:mm")}`,
                },
              ]}
            />
          );
        }
      })}
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <Favorites />
    </View>
  );
}
