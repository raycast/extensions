import { Detail, Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { useState, useEffect } from "react";
import { getMotionApiClient } from "./api/motion";

export default function Command() {
  const [query, setQuery] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [tasksData, setTasksData] = useState<string | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load Motion task data to provide context to the AI
  async function loadMotionData() {
    setIsLoadingTasks(true);
    try {
      const motionClient = getMotionApiClient();
      const tasks = await motionClient.getTasks();

      // Check if tasks is an array and not empty
      if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        console.log("[DEBUG] No tasks found or tasks is not an array:", tasks);
        setTasksData("No tasks found in Motion.");
        return;
      }

      // Format tasks data for AI context
      const formattedTasks = tasks
        .map((task) => {
          return `
Title: ${task.name}
Description: ${task.description || "N/A"}
Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "N/A"}
Priority: ${task.priority || "N/A"}
Status: ${task.status || "N/A"}
Label: ${task.label || "N/A"}
        `;
        })
        .join("\n---\n");

      setTasksData(formattedTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: String(error),
      });
      setTasksData("Error loading tasks data");
    } finally {
      setIsLoadingTasks(false);
    }
  }

  // Submit query to AI with tasks context
  function handleSubmit(values: { query: string }) {
    setQuery(values.query);
    loadMotionData();
    setIsSubmitted(true);
  }

  // AI prompt with Motion tasks context
  const prompt = `You are an AI assistant for the Motion app, a task and productivity tool.
  
The user has the following tasks in their Motion account:

${tasksData || "Loading tasks..."}

Based on the above tasks, please answer the following question:
${query}`;

  // Only call useAI after form submission with appropriate context
  const { data, isLoading: aiLoading } = useAI(isSubmitted ? prompt : "", {
    execute: isSubmitted && !isLoadingTasks && !!tasksData,
  });

  // Initialize the application
  useEffect(() => {
    // We don't need to store workspaces or errors in this component,
    // just need to mark loading as complete when initialization is done
    async function initialize() {
      try {
        const motionClient = getMotionApiClient();
        await motionClient.getWorkspaces();
      } catch (err) {
        console.error("Error initializing:", err);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to initialize",
          message: String(err),
        });
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  // Form view for entering the query
  if (!isSubmitted) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.Description text="Ask AI about your Motion tasks and schedule" />
        <Form.TextField id="query" title="Question" placeholder="When are my upcoming deadlines?" />
      </Form>
    );
  }

  // Detail view for showing AI response
  return (
    <Detail
      isLoading={aiLoading || isLoadingTasks || isLoading}
      markdown={data || "Loading..."}
      actions={
        <ActionPanel>
          <Action title="Ask Another Question" onAction={() => setIsSubmitted(false)} />
        </ActionPanel>
      }
    />
  );
}
