import { Action, ActionPanel, Detail, environment } from "@raycast/api";
import tildify from "tildify";

interface ExtensionErrorProps {
  title: string;
  message: string;
  vscodeAppName?: string;
  storagePath?: string;
  projectsJsonPath?: string;
  isDefaultPath?: boolean;
}

export function ExtensionError({
  title,
  message,
  vscodeAppName,
  storagePath,
  projectsJsonPath,
  isDefaultPath,
}: ExtensionErrorProps) {
  const markdown = `# ${title}\n\n${message}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {vscodeAppName ? (
            <Detail.Metadata.Label title="VS Code App" text={vscodeAppName} />
          ) : null}
          {storagePath ? (
            <Detail.Metadata.Label
              title={`Project Manager Data Path${isDefaultPath ? " (Default)" : ""}`}
              text={tildify(storagePath)}
            />
          ) : null}
          {projectsJsonPath ? (
            <Detail.Metadata.Label
              title="projects.json"
              text={tildify(projectsJsonPath)}
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        environment.isDevelopment && storagePath ? (
          <ActionPanel>
            <Action.ShowInFinder
              title="Show Data Directory in Finder"
              path={storagePath}
            />
            <Action.CopyToClipboard
              title="Copy Data Directory Path"
              content={storagePath}
            />
            {projectsJsonPath ? (
              <Action.CopyToClipboard
                title="Copy Projects.json Path"
                content={projectsJsonPath}
              />
            ) : null}
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
