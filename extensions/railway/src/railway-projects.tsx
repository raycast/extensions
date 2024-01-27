import { ActionPanel, getPreferenceValues, List, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchProjects, ProjectGQL, projectUrl } from "./railway";

export interface Preferences {
  railwayApiKey?: string;
}

export default function Command() {
  const preferences: Preferences = getPreferenceValues();
  return <ListProjects token={preferences.railwayApiKey ?? ""} />;
}

const ListProjects: React.FC<{ token: string }> = ({ token }) => {
  const [projects, setProjects] = useState<ProjectGQL[] | null>(null);

  useEffect(() => {
    (async () => {
      const projects = await fetchProjects(token);
      setProjects(projects);
    })();
  }, []);

  return (
    <List isLoading={projects == null}>
      {projects != null && (
        <>
          {projects.map((p) => (
            <List.Item
              key={p.id}
              title={p.name}
              subtitle={p.description}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser title="Project Settings" url={projectUrl(p.id, "settings")} />
                    <Action.OpenInBrowser title="Project Deployments" url={projectUrl(p.id, "deployments")} />
                    <Action.OpenInBrowser
                      title="Latest Deployment"
                      url={projectUrl(p.id, "deployments?open=true")}
                      shortcut={{ modifiers: ["cmd"], key: "l" }}
                    />
                    <Action.OpenInBrowser
                      title="Project Variables"
                      url={projectUrl(p.id, "variables")}
                      shortcut={{ modifiers: ["cmd"], key: "v" }}
                    />
                    <Action.OpenInBrowser
                      title="Project Metrics"
                      url={projectUrl(p.id, "metrics")}
                      shortcut={{ modifiers: ["cmd"], key: "m" }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Project URL"
                      content={projectUrl(p.id)}
                      shortcut={{ modifiers: ["opt"], key: "c" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
};
