import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { createClient, createSession, listSessions, promptSession } from "../lib/opencode";
import type { OpencodeTarget, RecentSession, RecentTarget, SessionSummary } from "../lib/types";

type PromptFormProps = {
  serverUrl: string;
  initialTarget?: OpencodeTarget;
  recentTargets: RecentTarget[];
  recentSessions: RecentSession[];
  initialSessionID?: string;
  onSent: (sessionID: string, target: OpencodeTarget) => Promise<void>;
};

type PromptValues = {
  directory: string;
  workspace?: string;
  sessionID?: string;
  newTitle?: string;
  prompt: string;
};

export function PromptForm(props: PromptFormProps) {
  const client = useMemo(() => createClient(props.serverUrl), [props.serverUrl]);
  const { pop } = useNavigation();
  const [directory, setDirectory] = useState(props.initialTarget?.directory ?? "");
  const [workspace, setWorkspace] = useState(props.initialTarget?.workspace ?? "");
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!directory.trim()) {
        setSessions([]);
        return;
      }
      setIsLoadingSessions(true);
      try {
        const target = {
          directory: directory.trim(),
          workspace: workspace.trim() || undefined,
        };
        const recent = await listSessions(client, target);
        setSessions(
          recent.map((session) => ({
            info: session,
            pendingCount: 0,
            preview: "",
          })),
        );
      } finally {
        setIsLoadingSessions(false);
      }
    };
    void load();
  }, [client, directory, workspace]);

  return (
    <Form
      isLoading={isLoadingSessions}
      navigationTitle="Ask OpenCode"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Prompt"
            onSubmit={async (values: PromptValues) => {
              const target: OpencodeTarget = {
                directory: values.directory.trim(),
                workspace: values.workspace?.trim() || undefined,
              };
              if (!target.directory) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Directory is required",
                });
                return;
              }
              if (!values.prompt.trim()) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Prompt is required",
                });
                return;
              }
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Sending prompt...",
              });
              try {
                let sessionID = values.sessionID?.trim();
                if (!sessionID) {
                  const session = await createSession(client, {
                    target,
                    title: values.newTitle?.trim() || undefined,
                  });
                  sessionID = session.id;
                }
                await promptSession(client, {
                  target,
                  sessionID,
                  text: values.prompt.trim(),
                });
                toast.style = Toast.Style.Success;
                toast.title = "Prompt sent";
                await props.onSent(sessionID, target);
                pop();
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Failed to send prompt";
                toast.message = error instanceof Error ? error.message : String(error);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="recentTarget"
        title="Recent Targets"
        onChange={(value) => {
          const target = props.recentTargets.find((item) => `${item.directory}::${item.workspace ?? ""}` === value);
          if (!target) {
            return;
          }
          setDirectory(target.directory);
          setWorkspace(target.workspace ?? "");
        }}
      >
        {props.recentTargets.map((target) => (
          <Form.Dropdown.Item
            key={`${target.directory}::${target.workspace ?? ""}`}
            value={`${target.directory}::${target.workspace ?? ""}`}
            title={target.label}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField id="directory" title="Directory" value={directory} onChange={setDirectory} />
      <Form.TextField
        id="workspace"
        title="Workspace"
        value={workspace}
        onChange={setWorkspace}
        placeholder="Optional workspace ID"
      />
      <Form.Dropdown id="sessionID" title="Existing Session" defaultValue={props.initialSessionID ?? ""}>
        <Form.Dropdown.Item value="" title="Create New Session" />
        {props.recentSessions.map((session) => (
          <Form.Dropdown.Item key={session.id} value={session.id} title={session.title || session.id} />
        ))}
        {sessions.map((session) => (
          <Form.Dropdown.Item
            key={session.info.id}
            value={session.info.id}
            title={session.info.title || session.info.id}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField id="newTitle" title="New Session Title" placeholder="Optional for new sessions" />
      <Form.TextArea id="prompt" title="Prompt" placeholder="What do you want OpenCode to do?" />
    </Form>
  );
}
