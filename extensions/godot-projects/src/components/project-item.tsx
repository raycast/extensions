import { Action, ActionPanel, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { homedir } from "node:os";
import { openInEditor, openProjectManager, runProject } from "../lib/launch";
import { abbreviateHome, getKeywords, GodotProject } from "../lib/projects";

const DEFAULT_ICON = "extension-icon.png";

function getIcon(project: GodotProject): Image.ImageLike {
  return project.iconPath ? { source: project.iconPath, fallback: DEFAULT_ICON } : DEFAULT_ICON;
}

function getAccessories(project: GodotProject): List.Item.Accessory[] {
  if (project.status !== "ok") {
    return [
      {
        tag: { value: project.status === "missing" ? "Missing" : "Unreadable", color: Color.Orange },
        icon: { source: Icon.Warning, tintColor: Color.Orange },
        tooltip: project.problem,
      },
    ];
  }

  const accessories: List.Item.Accessory[] = [];
  if (project.engineVersion) {
    const details = [`Godot ${project.engineVersion}`, project.renderer].filter(Boolean).join(", ");
    accessories.push({ tag: project.engineVersion, tooltip: details });
  }
  if (project.isCSharp) {
    accessories.push({ tag: { value: "C#", color: Color.Purple }, tooltip: "Uses C#" });
  }
  if (project.lastModified) {
    const date = new Date(project.lastModified);
    accessories.push({ date, tooltip: `Last edited ${date.toLocaleString()}` });
  }
  return accessories;
}

export function ProjectItem({ project, onReload }: { project: GodotProject; onReload: () => void }) {
  const home = homedir();
  const canOpen = project.status !== "missing";

  const openProjectManagerAction = (
    <Action
      title="Open Project Manager"
      icon={Icon.AppWindowList}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      onAction={openProjectManager}
    />
  );

  return (
    <List.Item
      icon={getIcon(project)}
      title={project.name}
      subtitle={{
        value: abbreviateHome(project.path, home),
        tooltip: project.description ? `${project.path}\n\n${project.description}` : project.path,
      }}
      keywords={getKeywords(project, home)}
      accessories={getAccessories(project)}
      actions={
        <ActionPanel title={project.name}>
          <ActionPanel.Section>
            {canOpen ? (
              <>
                <Action title="Open in Godot" icon={DEFAULT_ICON} onAction={() => openInEditor(project)} />
                <Action title="Run Project" icon={Icon.Play} onAction={() => runProject(project)} />
              </>
            ) : (
              openProjectManagerAction
            )}
            {project.folderExists && (
              <Action.ShowInFinder path={project.path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Path"
              content={project.path}
              shortcut={Keyboard.Shortcut.Common.CopyPath}
            />
            {canOpen && openProjectManagerAction}
            <Action
              title="Reload Projects"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onReload}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
