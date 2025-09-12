import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Preferences {
  branchPrefix: string;
  azureOrganization?: string;
  azureProject?: string;
  azureRepository?: string;
  sourceBranch: string;
}

interface TeamMember {
  displayName: string;
  uniqueName: string;
  id: string;
}

interface Feature {
  id: number;
  title: string;
  state: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedFeature, setSelectedFeature] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Predefined common tags for user stories
  const commonTags = [
    { value: "", title: "No Tag" },
    { value: "Frontend", title: "Frontend" },
    { value: "Backend", title: "Backend" },
    { value: "API", title: "API" },
    { value: "Database", title: "Database" },
    { value: "UI/UX", title: "UI/UX" },
    { value: "Performance", title: "Performance" },
    { value: "Security", title: "Security" },
    { value: "Testing", title: "Testing" },
    { value: "Documentation", title: "Documentation" },
  ];

  async function loadFormData() {
    setIsLoadingData(true);
    try {
      const preferences = getPreferenceValues<Preferences>();
      const azCommand = "/opt/homebrew/bin/az";

      if (!preferences.azureOrganization) {
        throw new Error(
          "Azure DevOps organization URL is required. Please configure it in preferences.",
        );
      }

      if (!preferences.azureProject) {
        throw new Error(
          "Azure DevOps project name is required. Please configure it in preferences or run: az devops configure --defaults project=<ProjectName>",
        );
      }

      // Load team members by querying existing work items to get assignees
      // This is a workaround since there's no direct team member list command
      const teamMembersCommand = `${azCommand} boards query --wiql "SELECT [System.AssignedTo] FROM WorkItems WHERE [System.TeamProject] = '${preferences.azureProject}' AND [System.AssignedTo] <> ''" --output json --organization "${preferences.azureOrganization}" --project "${preferences.azureProject}"`;

      // Load Feature work items
      const featuresCommand = `${azCommand} boards query --wiql "SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.WorkItemType] = 'Feature' AND [System.TeamProject] = '${preferences.azureProject}' AND [System.State] <> 'Closed' AND [System.State] <> 'Removed' ORDER BY [System.Title] ASC" --output json --organization "${preferences.azureOrganization}" --project "${preferences.azureProject}"`;

      const [teamResult, featuresResult] = await Promise.all([
        execAsync(teamMembersCommand).catch(() => ({ stdout: "[]" })), // Fallback to empty array if query fails
        execAsync(featuresCommand).catch(() => ({ stdout: "[]" })), // Fallback to empty array if features fail
      ]);

      // Process team members - extract unique assignees
      const workItems = JSON.parse(teamResult.stdout);
      const uniqueAssignees = new Map<string, TeamMember>();

      workItems.forEach(
        (item: {
          fields?: {
            "System.AssignedTo"?: {
              displayName: string;
              uniqueName: string;
              id?: string;
            };
          };
        }) => {
          const assignedTo = item.fields?.["System.AssignedTo"];
          if (assignedTo && assignedTo.uniqueName) {
            uniqueAssignees.set(assignedTo.uniqueName, {
              displayName: assignedTo.displayName,
              uniqueName: assignedTo.uniqueName,
              id: assignedTo.id || assignedTo.uniqueName,
            });
          }
        },
      );

      setTeamMembers(Array.from(uniqueAssignees.values()));

      // Process features
      const featureWorkItems = JSON.parse(featuresResult.stdout);
      const processedFeatures: Feature[] = [];

      if (Array.isArray(featureWorkItems)) {
        featureWorkItems.forEach(
          (item: {
            id: number;
            fields?: { "System.Title"?: string; "System.State"?: string };
          }) => {
            processedFeatures.push({
              id: item.id,
              title: item.fields?.["System.Title"] || "Unknown Feature",
              state: item.fields?.["System.State"] || "Unknown",
            });
          },
        );
      }

      setFeatures(processedFeatures);
    } catch (error) {
      console.error("Failed to load form data:", error);
      // Continue with empty arrays - user can still create stories without dropdowns
      setTeamMembers([]);
      setFeatures([]);
    } finally {
      setIsLoadingData(false);
    }
  }

  async function createUserStory() {
    if (!title.trim()) {
      await showToast(Toast.Style.Failure, "Error", "Title is required");
      return;
    }

    setIsLoading(true);
    try {
      const preferences = getPreferenceValues<Preferences>();
      const azCommand = "/opt/homebrew/bin/az";

      if (!preferences.azureOrganization) {
        throw new Error(
          "Azure DevOps organization URL is required. Please configure it in preferences.",
        );
      }

      if (!preferences.azureProject) {
        throw new Error(
          "Azure DevOps project name is required. Please configure it in preferences.",
        );
      }

      // Build the create command
      let createCommand = `${azCommand} boards work-item create --title "${title.trim()}" --type "User Story" --output json --organization "${preferences.azureOrganization}" --project "${preferences.azureProject}"`;

      // Add optional fields
      if (description.trim()) {
        createCommand += ` --description "${description.trim()}"`;
      }

      if (selectedAssignee) {
        createCommand += ` --assigned-to "${selectedAssignee}"`;
      }

      // Add tags as custom field if selected
      const fieldsArray: string[] = [];
      if (selectedTag) {
        fieldsArray.push(`"System.Tags=${selectedTag}"`);
      }

      if (fieldsArray.length > 0) {
        createCommand += ` --fields ${fieldsArray.join(" ")}`;
      }

      const { stdout } = await execAsync(createCommand);
      const createdWorkItem = JSON.parse(stdout);

      // If a feature is selected, create parent-child relationship
      if (selectedFeature) {
        try {
          const relationCommand = `${azCommand} boards work-item relation add --id ${createdWorkItem.id} --relation-type parent --target-id ${selectedFeature} --output json --organization "${preferences.azureOrganization}"`;
          await execAsync(relationCommand);
        } catch (relationError) {
          console.error("Failed to set parent feature:", relationError);
          // Don't fail the entire operation if relation fails
          await showToast(
            Toast.Style.Failure,
            "Warning",
            "User story created but failed to link to parent feature",
          );
        }
      }

      const parentInfo = selectedFeature
        ? features.find((f) => f.id.toString() === selectedFeature)?.title
        : null;

      await showToast(
        Toast.Style.Success,
        "User Story Created!",
        `#${createdWorkItem.id}: ${title}${parentInfo ? ` (under ${parentInfo})` : ""}`,
      );

      // Clear form
      setTitle("");
      setDescription("");
      setSelectedTag("");
      setSelectedFeature("");
      setSelectedAssignee("");

      // Optionally pop to root or stay in form for creating more stories
      // popToRoot();
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        "Error",
        "Failed to create user story",
      );
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFormData();
  }, []);

  return (
    <Form
      isLoading={isLoading || isLoadingData}
      actions={
        <ActionPanel>
          <Action
            title="Create User Story"
            onAction={createUserStory}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action
            title="Clear Form"
            onAction={() => {
              setTitle("");
              setDescription("");
              setSelectedTag("");
              setSelectedFeature("");
              setSelectedAssignee("");
            }}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter user story title..."
        value={title}
        onChange={setTitle}
        error={
          title.trim() === "" && isLoading ? "Title is required" : undefined
        }
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="As a [user type], I want [functionality] so that [benefit]..."
        value={description}
        onChange={setDescription}
      />

      <Form.Dropdown
        id="tag"
        title="Tag"
        value={selectedTag}
        onChange={setSelectedTag}
      >
        {commonTags.map((tag) => (
          <Form.Dropdown.Item
            key={tag.value}
            value={tag.value}
            title={tag.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="feature"
        title="Parent Feature"
        value={selectedFeature}
        onChange={setSelectedFeature}
      >
        <Form.Dropdown.Item value="" title="No Parent Feature" />
        {features.map((feature) => (
          <Form.Dropdown.Item
            key={feature.id}
            value={feature.id.toString()}
            title={`#${feature.id}: ${feature.title}`}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="assignee"
        title="Assignee"
        value={selectedAssignee}
        onChange={setSelectedAssignee}
      >
        <Form.Dropdown.Item value="" title="Unassigned" />
        {teamMembers.map((member) => (
          <Form.Dropdown.Item
            key={member.uniqueName}
            value={member.uniqueName}
            title={member.displayName}
          />
        ))}
      </Form.Dropdown>

      <Form.Description text="Only title is required. All other fields are optional." />
    </Form>
  );
}
