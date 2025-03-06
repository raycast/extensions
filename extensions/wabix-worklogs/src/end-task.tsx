import { Form, ActionPanel, Action, showToast, Toast, Icon, popToRoot } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import { endTask, endSession, getActiveSession, requiresGithubUrl } from "../utils";
import { Project, TaskType } from "../types";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [taskType, setTaskType] = useState<TaskType>(TaskType.TASK);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const taskTypeDropdownRef = useRef<Form.Dropdown>(null);

  // Check if there's an active session on component mount
  useEffect(() => {
    async function checkActiveSession() {
      try {
        const activeSession = await getActiveSession();
        if (activeSession) {
          setActiveProject(activeSession.project);
          setErrorMessage(null);
        } else {
          setErrorMessage("No active session found. Start a session first.");
        }
      } catch (error) {
        setErrorMessage("Failed to load active session");
      } finally {
        setIsLoading(false);
      }
    }

    checkActiveSession();
  }, []);

  // Handle form submission
  const handleSubmit = async (values: {
    description: string;
    taskType: string;
    githubUrl?: string;
    endSession: boolean;
  }) => {
    try {
      setIsLoading(true);
      const selectedTaskType = values.taskType as TaskType;

      // Validate GitHub URL for required task types
      if (requiresGithubUrl(selectedTaskType) && !values.githubUrl) {
        showToast({
          style: Toast.Style.Failure,
          title: "GitHub URL Required",
          message: `GitHub URL is required for ${selectedTaskType} tasks`,
        });
        setIsLoading(false);
        return;
      }

      // End the task
      await endTask(values.description, selectedTaskType, values.githubUrl);

      // If also ending the session
      if (values.endSession) {
        await endSession();
        showToast({
          style: Toast.Style.Success,
          title: "Task and Session Ended",
          message: `Task logged and session for ${activeProject?.name} has ended`,
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Task Logged",
          message: "Task has been successfully logged",
        });
      }

      // Return to root
      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Log Task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setIsLoading(false);
    }
  };

  if (errorMessage) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Start a Session"
              url="raycast://extensions/aliarthur/wabix-worklogs/start-session"
            />
          </ActionPanel>
        }
      >
        <Form.Description title="Error" text={errorMessage} />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Task" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
          <Action
            title="Focus Task Type"
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={() => taskTypeDropdownRef.current?.focus()}
          />
        </ActionPanel>
      }
    >
      {activeProject && <Form.Description title="Current Session" text={activeProject.name} />}

      <Form.Dropdown
        id="taskType"
        title="Task Type"
        value={taskType}
        onChange={(newValue) => setTaskType(newValue as TaskType)}
        ref={taskTypeDropdownRef}
      >
        <Form.Dropdown.Item value={TaskType.TASK} title="Task" icon={Icon.Code} />
        <Form.Dropdown.Item value={TaskType.BUG_FIX} title="Bug Fix" icon={Icon.Bug} />
        <Form.Dropdown.Item value={TaskType.CHANGE_REQUEST} title="Change Request" icon={Icon.EditShape} />
        <Form.Dropdown.Item value={TaskType.CALL} title="Call" icon={Icon.Phone} />
        <Form.Dropdown.Item value={TaskType.QA} title="QA" icon={Icon.CheckCircle} />
        <Form.Dropdown.Item value={TaskType.ADMINISTRATIVE} title="Administrative" icon={Icon.Document} />
        <Form.Dropdown.Item value={TaskType.OTHER} title="Other" icon={Icon.QuestionMark} />
      </Form.Dropdown>

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="What did you work on?"
        enableMarkdown
        autoFocus
      />

      {requiresGithubUrl(taskType) && (
        <Form.TextField id="githubUrl" title="GitHub URL" placeholder="https://github.com/user/repo/commit/hash" />
      )}

      <Form.Checkbox id="endSession" label="End Session After Task" defaultValue={false} />
    </Form>
  );
}
