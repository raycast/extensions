import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { loadProjects, Project } from "./projects";
import { launchClaude, openInVSCode } from "./terminal";
import { Sessions } from "./sessions";

export default function Command() {
  const { data: projects, isLoading } = usePromise(loadProjects);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Claude Code projects..."
    >
      <List.EmptyView
        icon={Icon.Folder}
        title="No projects found"
        description="No Claude Code sessions in ~/.claude/projects."
      />
      {(projects ?? []).map((project) => (
        <ProjectItem key={project.id} project={project} />
      ))}
    </List>
  );
}

function ProjectItem({ project }: { project: Project }) {
  const accessories: List.Item.Accessory[] = [
    {
      text: `${project.sessionCount} ${project.sessionCount === 1 ? "session" : "sessions"}`,
    },
  ];
  if (project.lastActivity) {
    accessories.push({
      date: project.lastActivity,
      tooltip: project.lastActivity.toLocaleString(),
    });
  }
  if (project.cwd && !project.cwdExists) {
    accessories.unshift({
      icon: Icon.Warning,
      tooltip: "Project folder no longer exists",
    });
  }

  return (
    <List.Item
      icon={project.cwdExists ? Icon.Folder : Icon.QuestionMark}
      title={project.name}
      subtitle={project.cwd ?? "path not identified"}
      keywords={
        project.cwd ? project.cwd.split(/[\\/]+/).filter(Boolean) : [project.id]
      }
      accessories={accessories}
      actions={
        <ActionPanel>
          {project.cwd && project.cwdExists && (
            <>
              <Action
                title="Open in Claude"
                icon={Icon.Terminal}
                onAction={() => launchClaude(project.cwd!, [])}
              />
              <Action
                title="Continue Last Session"
                icon={Icon.RotateClockwise}
                onAction={() => launchClaude(project.cwd!, ["--continue"])}
              />
              <Action.Push
                title="Resume Specific Session"
                icon={Icon.List}
                shortcut={Keyboard.Shortcut.Common.Save}
                target={<Sessions project={project} />}
              />
              <Action
                title="Open in VS Code"
                icon={Icon.Code}
                shortcut={Keyboard.Shortcut.Common.Open}
                onAction={() => openInVSCode(project.cwd!)}
              />
              <Action.Open
                title="Open in Explorer"
                icon={Icon.Folder}
                target={project.cwd}
                shortcut={Keyboard.Shortcut.Common.Edit}
              />
            </>
          )}
          {project.cwd && (
            <Action.CopyToClipboard
              title="Copy Path"
              content={project.cwd}
              shortcut={{ modifiers: ["ctrl"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
