import { Action, ActionPanel, Form, open } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import { validateRepo } from "./validate-repo";

export default function Command() {
  const [repo, setRepo] = useCachedState("repo", "");
  const [taskError, setTaskError] = useState<string | undefined>();
  const [repoError, setRepoError] = useState<string | undefined>();

  function dropTaskErrorIfNeeded() {
    if (taskError && taskError.length > 0) {
      setTaskError(undefined);
    }
  }

  function dropRepoErrorIfNeeded() {
    if (repoError && repoError.length > 0) {
      setRepoError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values) => {
              if (!values.task) {
                setTaskError("Task cannot be empty");
                return;
              }

              const repo = values.repo || "githubnext/workspace-blank";

              open(
                `https://copilot-workspace.githubnext.com/${repo}?task=${encodeURIComponent(
                  values.task
                )}`
              );
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="task"
        title="Task"
        placeholder="Describe a task..."
        error={taskError}
        onChange={dropTaskErrorIfNeeded}
        onBlur={(event) => {
          if (!event.target.value) {
            setTaskError("Task cannot be empty");
          } else {
            dropTaskErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="repo"
        title="Repository"
        placeholder="e.g. owner/repo"
        value={repo}
        error={repoError}
        onChange={(value) => {
          setRepo(value);
          dropRepoErrorIfNeeded();
        }}
        onBlur={(event) => {
          if (event.target.value && !validateRepo(event.target.value)) {
            setRepoError(
              "Invalid repository. Please provide a valid repository name in the format owner/repo"
            );
          } else {
            dropRepoErrorIfNeeded();
          }
        }}
      />
      <Form.Description text="Leave the repository field empty to create a new repository." />
    </Form>
  );
}
