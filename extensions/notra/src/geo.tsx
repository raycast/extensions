import { Action, ActionPanel, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { GeoDashboard } from "./components/geo-dashboard";
import { useGeoProjects } from "./hooks/use-geo";
import { notraUrl } from "./utils";

export default function Command() {
  const { data, error, isLoading, revalidate } = useGeoProjects();
  const projects = data?.projects ?? [];
  const organization = data?.organization ?? { id: "", logo: null, name: "", slug: "" };
  const onlyProject = projects.length === 1 ? projects[0] : undefined;

  if (!isLoading && !error && onlyProject) {
    return <GeoDashboard organization={organization} project={onlyProject} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search GEO projects...">
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Load GEO Projects"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowClockwise}
                title="Retry"
                onAction={revalidate}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : !isLoading && projects.length === 0 ? (
        <List.EmptyView
          icon={Icon.Gauge}
          title="No GEO Projects"
          description="Create a GEO project in Notra to start tracking AI visibility."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon={Icon.Globe}
                title="Open GEO in Notra"
                url={notraUrl(`/${organization.slug}/geo`)}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {!error
        ? projects.map((project) => (
            <List.Item
              key={project.id}
              icon={Icon.Gauge}
              title={project.name}
              subtitle="GEO analytics"
              accessories={[{ date: new Date(project.createdAt), tooltip: "Created" }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.LineChart}
                    title="Open GEO Dashboard"
                    target={<GeoDashboard organization={organization} project={project} />}
                  />
                </ActionPanel>
              }
            />
          ))
        : null}
    </List>
  );
}
