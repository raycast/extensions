import { ActionPanel, Action, Icon, List, showToast, Toast, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { Project, ProjectLink } from "../types";
import { getLinks, deleteLink } from "../utils/storage";
import { LinkForm } from "./LinkForm";
import { getFaviconUrl } from "../utils/favicon";

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
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load links",
        message: String(error),
      });
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
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete link",
        message: String(error),
      });
    }
  }

  async function openAllLinks() {
    try {
      for (const link of links) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Opening ${link.title}...`,
        });
        await open(link.url);
      }
      await showToast({
        style: Toast.Style.Success,
        title: "Opened all links",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open links",
        message: String(error),
      });
    }
  }

  useEffect(() => {
    loadLinks();
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
          {links.length > 0 && (
            <Action
              title="Open All Links"
              icon={Icon.Globe}
              onAction={openAllLinks}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
          )}
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
          icon={getFaviconUrl(link.url) || Icon.Link}
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
                {links.length > 1 && (
                  <Action
                    title="Open All Links"
                    icon={Icon.Globe}
                    onAction={openAllLinks}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                  />
                )}
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
