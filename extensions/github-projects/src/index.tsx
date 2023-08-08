import { List, getPreferenceValues, LocalStorage, Icon } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { graphqlClient, Project, RecentProjectsQuery, recentProjectsQuery, View } from "./query";
import { ProjectItem } from "./projectItem";
import { Preferences } from "./preferences";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { login } = getPreferenceValues<Preferences>();

export default function Command() {
  const [isLoadingRecentProjects, setIsLoadingRecentProjects] = useState<boolean>(true);
  const [recentProjects, setRecentProjects] = useState<Array<Project>>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Array<RecentlyViewedItem>>([]);
  const recentlyViewedSet = useMemo(() => new Set(recentlyViewed.map((item) => item.key)), [recentlyViewed]);

  useEffect(() => {
    async function fetchRecentProjects() {
      try {
        setIsLoadingRecentProjects(true);

        const result: RecentProjectsQuery = await graphqlClient(recentProjectsQuery, { login });

        setRecentProjects(result.organization.recentProjects.nodes);
        setIsLoadingRecentProjects(false);
      } catch (error) {
        console.error(error);
      }
    }

    fetchRecentProjects();
  }, []);

  useEffect(() => {
    async function parseRecentlyViewedProjects() {
      try {
        const recentlyViewedItems = await getRecentlyViewed(recentProjects);
        setRecentlyViewed(recentlyViewedItems.sort((a, b) => (a.value < b.value ? 1 : -1)).slice(0, 5));
      } catch (error) {
        console.error(error);
      }
    }

    parseRecentlyViewedProjects();
  }, [recentProjects]);

  return (
    <List
      navigationTitle="Search Projects"
      searchBarPlaceholder="Search your Projects"
      isShowingDetail
      isLoading={isLoadingRecentProjects}
    >
      {recentlyViewed.length > 0 ? (
        <List.Section title="Recently Viewed">
          {recentlyViewed.map((item) => (
            <ProjectItem key={item.key} project={item.project} view={item.view} lastViewed={item.value} />
          ))}
        </List.Section>
      ) : null}
      {recentProjects.length > 0 && !isLoadingRecentProjects ? (
        <List.Section title="Recently Updated Projects">
          {recentProjects
            .filter((p) => !recentlyViewedSet.has(p.url))
            .map((p) => (
              <ProjectItem key={p.id} project={p} />
            ))}
        </List.Section>
      ) : (
        <List.EmptyView icon={Icon.XMarkCircle} title="No projects found" />
      )}
    </List>
  );
}

async function getRecentlyViewed(projects: Array<Project>): Promise<RecentlyViewedItem[]> {
  const currentJson = await LocalStorage.getItem(`recently-viewed`);

  if (!currentJson) return [];

  const hash = JSON.parse(currentJson.toString());

  if (typeof hash !== "object") throw "recently-viewed is not a JS object";

  const recentlyViewed: RecentlyViewedItem[] = [];

  projects.forEach((project) => {
    if (hash[project.url]) {
      recentlyViewed.push({
        key: project.url,
        value: hash[project.url],
        project: project,
      });
    }

    project.views.nodes.forEach((view) => {
      if (hash[`${project.url}/views/${view.number}`]) {
        recentlyViewed.push({
          key: `${project.url}/views/${view.number}`,
          value: hash[project.url],
          project: project,
          view,
        });
      }
    });
  });

  return recentlyViewed;
}

interface RecentlyViewedItem {
  key: string;
  value: number;
  project: Project;
  view?: View;
}
