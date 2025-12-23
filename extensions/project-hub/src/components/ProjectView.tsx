import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Project, ProjectLink } from "../types";
import { getLinks, deleteLink, updateProjectUsage } from "../utils/storage";
import { LinkForm } from "./LinkForm";
import { showFailureToast, getFavicon } from "@raycast/utils";
import { OpenAllLinksAction } from "./actions/OpenAllLinksAction";

interface ProjectViewProps {
  project: Project;
}

export function ProjectView({ project }: ProjectViewProps) {
  const [links, setLinks] = useState<ProjectLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadLinks() {
    try {
      const projectLinks = await getLinks(project.id);
      setLinks(projectLinks);
    } catch (error) {
      await showFailureToast(error, { title: "Failed to load links" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteLink(id);
      await showToast({
        style: Toast.Style.Success,
        title: "Link deleted",
      });
      await loadLinks();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete link" });
    }
  }

  useEffect(() => {
    loadLinks();
    // Track project usage when component mounts
    updateProjectUsage(project.id).catch((error) => {
      showFailureToast(error, { title: "Failed to update project usage" });
    });
  }, [project.id]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search links..."
      navigationTitle={project.title}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add New Link"
            icon={Icon.Plus}
            target={<LinkForm projectId={project.id} onSave={loadLinks} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          {links.length > 0 && <OpenAllLinksAction links={links} />}
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.Link}
        title="No Links"
        description="Add your first link to this project"
        actions={
          <ActionPanel>
            <Action.Push
              title="Add New Link"
              icon={Icon.Plus}
              target={<LinkForm projectId={project.id} onSave={loadLinks} />}
            />
          </ActionPanel>
        }
      />
      {links.map((link) => (
        <List.Item
          key={link.id}
          icon={getFavicon(link.url) || Icon.Link}
          title={link.title}
          subtitle={link.url}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser url={link.url} />
                <Action.Push
                  title="Edit Link"
                  icon={Icon.Pencil}
                  target={<LinkForm projectId={project.id} link={link} onSave={loadLinks} />}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action.Push
                  title="Add New Link"
                  icon={Icon.Plus}
                  target={<LinkForm projectId={project.id} onSave={loadLinks} />}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                {links.length > 1 && <OpenAllLinksAction links={links} />}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={link.url}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Delete Link"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(link.id)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
