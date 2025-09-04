import { Form, ActionPanel, Action, showToast, Toast, Icon, open, environment, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { temboAPI, CodeRepository } from "./api";

type Values = {
  taskAssignment: string;
  repository: string;
};

export default function Command() {
  const [repositories, setRepositories] = useState<CodeRepository[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);

  useEffect(() => {
    async function fetchRepositories() {
      try {
        setIsLoadingRepos(true);
        const repos = await temboAPI.getCodeRepositories();
        setRepositories(repos);
      } catch (error) {
        console.error("Failed to fetch repositories:", error);

        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load repositories",
          message: error instanceof Error ? error.message : "Unknown error",
        });

        setRepositories([]);
      } finally {
        setIsLoadingRepos(false);
      }
    }

    fetchRepositories();
  }, []);

  async function handleSubmit(values: Values) {
    if (!values.taskAssignment?.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Task description required",
        message: "Please enter a task description",
      });
      return;
    }

    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Creating task...",
      });

      const result = await temboAPI.createIssue({
        title: `Task: ${values.taskAssignment.slice(0, 50)}${values.taskAssignment.length > 50 ? "..." : ""}`,
        description: values.taskAssignment,
        json: "{}",
        queueRightAway: true,
        codeRepoIds: values.repository ? [values.repository] : undefined,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Task created successfully",
        message: `Created issue: ${result.title}`,
      });

      popToRoot();
    } catch (error) {
      console.error("Failed to create task:", error);

      if (error instanceof Error && error.message.includes("401")) {
        showToast({
          style: Toast.Style.Failure,
          title: "Authentication Failed",
          message: "Please check your API key in the extension preferences",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to create task",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  const getGitHubIcon = () => {
    // Check if we're in dark mode using Raycast's environment
    const isDarkMode = environment.appearance === "dark";
    return isDarkMode ? "github-inverted.png" : "github.png";
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Code} title="Create Task" />
          <Action
            title="Open Tembo Web"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={() => open("http://localhost:3000")}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="taskAssignment" title="Task Assignment" placeholder="Assign a task to Tembo" />

      <Form.Dropdown
        id="repository"
        title="Repository"
        isLoading={isLoadingRepos}
        placeholder={isLoadingRepos ? "Loading repositories..." : "Select a repository"}
      >
        {repositories.map((repo) => (
          <Form.Dropdown.Item key={repo.id} value={repo.id} title={repo.name} icon={getGitHubIcon()} />
        ))}
      </Form.Dropdown>

      {repositories.length === 0 && !isLoadingRepos && (
        <Form.Description text="No repositories found. Please check your Git integrations in Tembo." />
      )}
    </Form>
  );
}
