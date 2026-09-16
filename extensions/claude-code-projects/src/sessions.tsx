import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { loadSessions, Project } from "./projects";
import { launchClaude } from "./terminal";

const SAFE_SESSION_ID = /^[0-9a-f-]{36}$/i;

export function Sessions({ project }: { project: Project }) {
  const { data: sessions, isLoading } = usePromise(loadSessions, [project]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={project.name}
      searchBarPlaceholder={`Search sessions in ${project.name}...`}
    >
      {(sessions ?? []).map((session) => (
        <List.Item
          key={session.id}
          icon={Icon.Message}
          title={session.preview ?? session.id}
          accessories={[
            {
              date: session.modifiedAt,
              tooltip: session.modifiedAt.toLocaleString(),
            },
          ]}
          keywords={[session.id]}
          actions={
            <ActionPanel>
              {SAFE_SESSION_ID.test(session.id) && project.cwd && (
                <Action
                  title="Resume This Session"
                  icon={Icon.Terminal}
                  onAction={() =>
                    launchClaude(project.cwd!, ["--resume", session.id])
                  }
                />
              )}
              <Action.CopyToClipboard
                title="Copy Session ID"
                content={session.id}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
