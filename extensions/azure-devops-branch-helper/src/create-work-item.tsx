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
import { runAz } from "./az-cli";

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
  const [workItemType, setWorkItemType] = useState("User Story");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedFeature, setSelectedFeature] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Work item types
  const workItemTypes = [
    { value: "User Story", title: "User Story", icon: "👤" },
    { value: "Feature", title: "Feature", icon: "⭐" },
    { value: "Bug", title: "Bug", icon: "🐛" },
  ];

  // Common tags for work items
  const getCommonTags = () => {
    const baseTags = [
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

    // Add type-specific tags
    if (workItemType === "Bug") {
      baseTags.push(
        { value: "Regression", title: "Regression" },
        { value: "Critical-Bug", title: "Critical Bug" },
        { value: "Data-Loss", title: "Data Loss" },
      );
    } else if (workItemType === "Feature") {
      baseTags.push(
        { value: "Enhancement", title: "Enhancement" },
        { value: "New-Feature", title: "New Feature" },
        { value: "Integration", title: "Integration" },
      );
    }

    return baseTags;
  };

  async function loadFormData() {
    setIsLoadingData(true);
    try {
      const preferences = getPreferenceValues<Preferences>();

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
      const teamWIQL = `SELECT [System.AssignedTo] FROM WorkItems WHERE [System.TeamProject] = '${
        preferences.azureProject || ""
      }' AND [System.AssignedTo] <> ''`;
      const featuresWIQL = `SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.WorkItemType] = 'Feature' AND [System.TeamProject] = '${
        preferences.azureProject || ""
      }' AND [System.State] <> 'Closed' AND [System.State] <> 'Removed' ORDER BY [System.Title] ASC`;

      const [teamResult, featuresResult] = await Promise.all([
        runAz([
          "boards",
          "query",
          "--wiql",
          teamWIQL,
          "--output",
          "json",
          "--organization",
          preferences.azureOrganization!,
          "--project",
          preferences.azureProject!,
        ]).catch(
          () =>
            ({ stdout: "[]", stderr: "" }) as {
              stdout: string;
              stderr: string;
            },
        ),
        runAz([
          "boards",
          "query",
          "--wiql",
          featuresWIQL,
          "--output",
          "json",
          "--organization",
          preferences.azureOrganization!,
          "--project",
          preferences.azureProject!,
        ]).catch(
          () =>
            ({ stdout: "[]", stderr: "" }) as {
              stdout: string;
              stderr: string;
            },
        ),
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
      setTeamMembers([]);
      setFeatures([]);
    } finally {
      setIsLoadingData(false);
    }
  }

  async function createWorkItem() {
    if (!title.trim()) {
      await showToast(Toast.Style.Failure, "Error", "Title is required");
      return;
    }

    setIsLoading(true);
    try {
      const preferences = getPreferenceValues<Preferences>();

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
      const fieldsArray: string[] = [];
      if (selectedTag) {
        // Do not include quotes when passing as separate args
        fieldsArray.push(`System.Tags=${selectedTag}`);
      }
      const createArgs = [
        "boards",
        "work-item",
        "create",
        "--title",
        title.trim(),
        "--type",
        workItemType,
        "--output",
        "json",
        "--organization",
        preferences.azureOrganization!,
        "--project",
        preferences.azureProject!,
        ...(description.trim() ? ["--description", description.trim()] : []),
        ...(selectedAssignee ? ["--assigned-to", selectedAssignee] : []),
        ...(fieldsArray.length > 0 ? ["--fields", ...fieldsArray] : []),
      ];
      const { stdout } = await runAz(createArgs);
      const createdWorkItem = JSON.parse(stdout);

      // If a feature is selected and we're creating a User Story or Bug, create parent-child relationship
      if (
        selectedFeature &&
        (workItemType === "User Story" || workItemType === "Bug")
      ) {
        try {
          await runAz([
            "boards",
            "work-item",
            "relation",
            "add",
            "--id",
            String(createdWorkItem.id),
            "--relation-type",
            "parent",
            "--target-id",
            selectedFeature,
            "--output",
            "json",
            "--organization",
            preferences.azureOrganization!,
          ]);
        } catch (relationError) {
          console.error("Failed to set parent feature:", relationError);
          await showToast(
            Toast.Style.Failure,
            "Warning",
            `${workItemType} created but failed to link to parent feature`,
          );
        }
      }

      const parentInfo = selectedFeature
        ? features.find((f) => f.id.toString() === selectedFeature)?.title
        : null;

      const workItemIcon =
        workItemTypes.find((t) => t.value === workItemType)?.icon || "📝";

      await showToast(
        Toast.Style.Success,
        `${workItemType} Created!`,
        `${workItemIcon} #${createdWorkItem.id}: ${title}${parentInfo ? ` (under ${parentInfo})` : ""}`,
      );

      // Clear form
      setTitle("");
      setDescription("");
      setSelectedTag("");
      setSelectedFeature("");
      setSelectedAssignee("");
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        "Error",
        `Failed to create ${workItemType.toLowerCase()}`,
      );
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  // Reset form when work item type changes
  const handleTypeChange = (newType: string) => {
    setWorkItemType(newType);
  };

  useEffect(() => {
    loadFormData();
  }, []);

  const getPlaceholderText = () => {
    switch (workItemType) {
      case "User Story":
        return "As a [user type], I want [functionality] so that [benefit]...";
      case "Feature":
        return "Describe the feature and its business value...";
      case "Bug":
        return "Steps to reproduce:\n1. \n2. \n3. \n\nExpected result:\nActual result:";
      default:
        return "Enter description...";
    }
  };

  const shouldShowParentFeature = () => {
    return workItemType === "User Story" || workItemType === "Bug";
  };

  return (
    <Form
      isLoading={isLoading || isLoadingData}
      actions={
        <ActionPanel>
          <Action
            title={`Create ${workItemType}`}
            onAction={createWorkItem}
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
      <Form.Dropdown
        id="workItemType"
        title="Work Item Type"
        value={workItemType}
        onChange={handleTypeChange}
      >
        {workItemTypes.map((type) => (
          <Form.Dropdown.Item
            key={type.value}
            value={type.value}
            title={`${type.icon} ${type.title}`}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="title"
        title="Title"
        placeholder={`Enter ${workItemType.toLowerCase()} title...`}
        value={title}
        onChange={setTitle}
        error={
          title.trim() === "" && isLoading ? "Title is required" : undefined
        }
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder={getPlaceholderText()}
        value={description}
        onChange={setDescription}
      />

      <Form.Dropdown
        id="tag"
        title="Tag"
        value={selectedTag}
        onChange={setSelectedTag}
      >
        {getCommonTags().map((tag) => (
          <Form.Dropdown.Item
            key={tag.value}
            value={tag.value}
            title={tag.title}
          />
        ))}
      </Form.Dropdown>

      {shouldShowParentFeature() && (
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
      )}

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

      <Form.Description
        text={`Only title is required. ${
          shouldShowParentFeature() ? "Parent Feature linking is optional." : ""
        } All other fields are optional.`}
      />
    </Form>
  );
}
