import { ActionPanel, Action, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import { getMotionApiClient } from "./api/motion";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>("Loading debug information...");
  const [error, setError] = useState<string | null>(null);

  // Define the loadDebugInfo function outside useEffect so it can be reused
  async function loadDebugInfo() {
    try {
      setIsLoading(true);
      setError(null);
      setDebugInfo("Loading debug information...");

      const motionClient = getMotionApiClient();

      let infoText = "# Motion Workspace Information\n\n";

      // Test API key and workspace ID
      infoText += "## API Configuration\n";
      infoText += "Testing API key and workspace ID configuration...\n\n";

      // Test workspace endpoint
      try {
        infoText += "## Workspaces Test\n";
        infoText += "Attempting to fetch workspaces...\n\n";

        const workspacesResponse = await motionClient.getWorkspaces();

        // Log the raw response for debugging
        console.log("[DEBUG] Workspaces response:", JSON.stringify(workspacesResponse, null, 2));

        // Extract workspaces array from the response
        const workspaces = workspacesResponse.workspaces || [];

        if (workspaces && Array.isArray(workspaces) && workspaces.length > 0) {
          infoText += "✅ Successfully retrieved workspaces\n\n";
          infoText += `Found ${workspaces.length} workspace(s):\n\n`;

          workspaces.forEach((workspace, index) => {
            infoText += `### Workspace ${index + 1}\n`;
            infoText += `- ID: \`${workspace.id}\`\n`;
            infoText += `- Name: ${workspace.name}\n`;
            infoText += `- Type: ${workspace.type}\n`;
            if (workspace.labels && Array.isArray(workspace.labels)) {
              infoText += `- Labels: ${workspace.labels.join(", ")}\n`;
            }
            infoText += "\n";
          });
        } else {
          infoText += "⚠️ No workspaces found\n\n";

          // Add more detailed debugging information
          infoText += "**Debug Information:**\n\n";
          infoText += "```\n";
          infoText += `Response type: ${typeof workspacesResponse}\n`;
          infoText += `Has workspaces property: ${workspacesResponse && "workspaces" in workspacesResponse}\n`;

          if (workspacesResponse) {
            infoText += "Response keys: " + Object.keys(workspacesResponse).join(", ") + "\n";

            if ("workspaces" in workspacesResponse) {
              infoText += `Workspaces type: ${typeof workspacesResponse.workspaces}\n`;
              infoText += `Is array: ${Array.isArray(workspacesResponse.workspaces)}\n`;

              if (Array.isArray(workspacesResponse.workspaces)) {
                infoText += `Array length: ${workspacesResponse.workspaces.length}\n`;
              }
            }
          }

          infoText += "Raw response: " + JSON.stringify(workspacesResponse, null, 2) + "\n";
          infoText += "```\n\n";

          infoText +=
            "This may be normal if you don't have any workspaces, or it could indicate an issue with the API response format.\n\n";
        }
      } catch (workspacesError) {
        infoText += `❌ Error fetching workspaces: ${String(workspacesError)}\n\n`;
      }

      // Test tasks endpoint
      try {
        infoText += "## Tasks Test\n";
        infoText += "Attempting to fetch tasks...\n\n";

        const tasks = await motionClient.getTasks();

        if (tasks && Array.isArray(tasks) && tasks.length > 0) {
          infoText += "✅ Successfully retrieved tasks\n\n";
          infoText += `Found ${tasks.length} task(s):\n\n`;

          // Show first 5 tasks as a sample
          const sampleTasks = tasks.slice(0, 5);
          sampleTasks.forEach((task, index) => {
            infoText += `### Task ${index + 1}\n`;
            infoText += `- ID: \`${task.id}\`\n`;
            infoText += `- Name: ${task.name}\n`;
            infoText += `- Status: ${task.status || "N/A"}\n`;
            infoText += `- Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "N/A"}\n`;
            infoText += "\n";
          });
        } else {
          infoText += "⚠️ No tasks found\n\n";
        }
      } catch (tasksError) {
        infoText += `❌ Error fetching tasks: ${String(tasksError)}\n\n`;
      }

      setDebugInfo(infoText);
    } catch (error) {
      setError(String(error));
      setDebugInfo("Error loading debug information.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDebugInfo();
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={debugInfo}
      actions={
        <ActionPanel>
          {error && (
            <Action.Push
              title="Show Error Details"
              target={
                <Detail
                  markdown={`**Error Details:**\n\n${error}`}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard content={error} />
                    </ActionPanel>
                  }
                />
              }
            />
          )}
        </ActionPanel>
      }
    />
  );
}
