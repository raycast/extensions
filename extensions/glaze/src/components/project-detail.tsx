import {
  Action,
  ActionPanel,
  closeMainWindow,
  Detail,
  Icon,
} from "@raycast/api";
import { GlazeApp, EDITOR_APPS } from "../lib/types";
import {
  editWithAgent,
  getAvailableEditors,
  launchApp,
  openInEditor,
  revealInFinder,
} from "../lib/deeplinks";
import * as fs from "fs";
import { GlazeAction } from "./glaze-action";

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ProjectDetail({ project }: { project: GlazeApp }) {
  const editors = getAvailableEditors();

  const glazePath = project.runtimePath;
  const sourcesPath = project.sourcesPath;
  const canEdit =
    project.variant === "local" && glazePath && fs.existsSync(glazePath);
  const canOpenInEditor = sourcesPath && fs.existsSync(sourcesPath);

  const markdown = `# ${project.displayName || project.name}\n\n${project.description || "No description"}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Version" text={project.version} />
          {project.sdkVersion && (
            <Detail.Metadata.Label
              title="SDK Version"
              text={project.sdkVersion}
            />
          )}
          <Detail.Metadata.Label
            title="Created"
            text={formatDate(project.createdAt)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="App ID" text={project.id} />
          {project.author && (
            <Detail.Metadata.Label title="Author" text={project.author} />
          )}
          <Detail.Metadata.Label
            title="Type"
            text={project.variant || "local"}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {project.bundlePath && (
              <GlazeAction
                title="Open App"
                icon={Icon.AppWindow}
                onAction={() => launchApp(project.bundlePath!)}
              />
            )}
            {canEdit && (
              <GlazeAction
                title="Edit with Agent"
                icon={Icon.Wand}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={async () => {
                  await editWithAgent(glazePath!, project.id);
                  await closeMainWindow();
                }}
              />
            )}
          </ActionPanel.Section>

          {canOpenInEditor && editors.length > 0 && (
            <ActionPanel.Section title="Open In">
              {editors.map((editor) => (
                <GlazeAction
                  key={editor}
                  title={`Open in ${EDITOR_APPS[editor].label}`}
                  icon={Icon.Code}
                  onAction={() => openInEditor(sourcesPath!, editor)}
                />
              ))}
            </ActionPanel.Section>
          )}

          <ActionPanel.Section>
            <GlazeAction
              title="Reveal in Finder"
              icon={Icon.Finder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={() => revealInFinder(project.path)}
            />
            <Action.CopyToClipboard
              title="Copy App Path"
              content={project.path}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
