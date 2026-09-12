import { ActionPanel, Action, List, showToast, Toast, Icon, Color, Detail } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { GerritAPI } from "../utils/api/gerrit";
import { GerritInstance } from "../interfaces/gerrit";
import { ProjectWebLinks, Project, ProjectBranch } from "../interfaces/project";

interface ProjectProps {
  gerrit: GerritInstance;
  projects?: string[];
  navigationTitle: string;
}

interface ProjectDetails {
  gerrit: GerritInstance;
  project: Project;
}

export function FetchProjects(props: ProjectProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [queryText, setSearchText] = useState<string>("");

  const fetch = useCallback(
    async function fetch(text: string) {
      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Fetching Projects",
      });
      if (queryText !== text) {
        setSearchText(text);
        toast.message = text;
      }
      try {
        const gerritAPI = new GerritAPI(props.gerrit);
        const projects = await gerritAPI.getProjects(text);
        setProjects(projects.filter((project: Project) => project ?? []));
        toast.hide();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Fetch failed";
        toast.message = String(err);
      } finally {
        setIsLoading(false);
      }
    },
    [setProjects]
  );

  useEffect(() => {
    fetch("");
  }, []);

  return (
    <List
      navigationTitle={props.navigationTitle}
      isLoading={isLoading}
      onSearchTextChange={fetch}
      searchBarPlaceholder="Search Projects"
      throttle
    >
      <List.Section title="Projects" subtitle={projects.length + ""}>
        {projects.map((project) => (
          <List.Item
            key={project.id}
            title={project.id}
            subtitle={project.description}
            accessories={[
              {
                tooltip: "Status",
                tag: { value: project.state, color: Color.PrimaryText },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Info}
                  title="Show Details"
                  target={<ProjectDetails project={project} gerrit={props.gerrit} />}
                />
                <Action.OpenInBrowser title="Open in Browser" url={project.url} />
                <ActionPanel.Section>
                  <Action.SubmitForm
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onSubmit={async () => {
                      await fetch(queryText);
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action.CopyToClipboard
                    icon={Icon.CopyClipboard}
                    title="Copy URL"
                    content={project.url}
                    shortcut={{ modifiers: ["cmd", "ctrl"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function ProjectDetails(details: ProjectDetails) {
  const [branches, setProjectBranches] = useState<ProjectBranch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetch = useCallback(
    async function fetch() {
      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Fetching additional details",
      });
      try {
        const gerritAPI = new GerritAPI(details.gerrit);
        const branches = await gerritAPI.getProjectBranches(details.project);
        setProjectBranches(branches);
        toast.hide();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to fetch details";
        toast.message = String(err);
      } finally {
        setIsLoading(false);
      }
    },
    [setProjectBranches]
  );

  useEffect(() => {
    fetch();
  }, []);
  return (
    <Detail
      navigationTitle={details.project.id}
      isLoading={isLoading}
      markdown={`# ${details.project.id}\n${details.project.description ? details.project.description : ""}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="State">
            <Detail.Metadata.TagList.Item key="State" text={details.project.state} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Branches">
            {branches ? (
              branches.map((b: ProjectBranch) => <Detail.Metadata.TagList.Item key={b.name} text={`${b.name}`} />)
            ) : (
              <></>
            )}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          {details.project.web_links ? (
            details.project.web_links.map((l: ProjectWebLinks) =>
              l != undefined ? (
                <Detail.Metadata.Link
                  key={l.name}
                  title={l.name}
                  target={l.target && l.target === "_blank" ? `${details.gerrit.url}${l.url}` : l.url}
                  text="Link"
                />
              ) : (
                <></>
              )
            )
          ) : (
            <></>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={details.project.url} />
            <Action.CopyToClipboard
              icon={Icon.CopyClipboard}
              title="Copy URL"
              content={details.project.url}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
