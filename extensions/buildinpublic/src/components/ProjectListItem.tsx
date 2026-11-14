import { Action, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { ReactNode } from "react";
import { Project } from "../types";

export function ProjectListItem({
  project,
  showOwner = false,
  actions,
}: {
  project: Project;
  showOwner?: boolean;
  actions: ReactNode;
}) {
  const accessories: List.Item.Accessory[] = [];
  if (showOwner) accessories.push({ text: `@${project.owner.username}` });
  if (!project.verified) accessories.push({ tag: { value: "Unverified", color: Color.Orange } });

  return (
    <List.Item
      title={project.name}
      subtitle={project.pitch ?? undefined}
      icon={
        project.icon_url
          ? { source: project.icon_url, mask: Image.Mask.RoundedRectangle, fallback: Icon.AppWindow }
          : Icon.AppWindow
      }
      keywords={[project.url, project.owner.username]}
      accessories={accessories}
      actions={actions}
    />
  );
}

export function ProjectOpenActions({ project }: { project: Project }) {
  return (
    <>
      <Action.OpenInBrowser title="Open on Build in Public" url={project.project_url} />
      <Action.OpenInBrowser title="Open Website" icon={Icon.Link} url={project.url} />
    </>
  );
}

export function ProjectCopyActions({ project }: { project: Project }) {
  return (
    <>
      <Action.CopyToClipboard
        title="Copy Build in Public Link"
        content={project.project_url}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <Action.CopyToClipboard
        title="Copy Website"
        content={project.url}
        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
      />
    </>
  );
}
