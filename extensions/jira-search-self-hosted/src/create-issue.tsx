import { Action, ActionPanel, Form, Icon, LocalStorage, useNavigation, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { jiraFetchObject } from "./jira";
import { searchProjects } from "./project";
import { Project, IssueType, Priority, JiraUser, JiraField, FormValues } from "./types/jira-types";
import { loadIssueTypes } from "./api/jira-issue-types";
import { loadPrioritiesForProject, resetPriorityCache } from "./api/jira-priorities";
import { loadFieldsFor, searchUsers } from "./api/jira-fields";
import { createIssue } from "./api/jira-issues";
import { DynamicFields } from "./components/issue-form/DynamicFields";
import { PriorityField } from "./components/issue-form/PriorityField";

// Keys for storing default settings
const DEFAULT_PROJECT_KEY = "defaultProject";
const DEFAULT_ISSUE_TYPE_KEY = "defaultIssueType";
const DEFAULT_PRIORITY_KEY = "defaultPriority";

/**
 * Command for creating a new issue in Jira
 */
export default function CreateIssueCommand() {
  const { pop } = useNavigation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPriorityLoading, setIsPriorityLoading] = useState(false);

  // State for current user
  const [currentUser, setCurrentUser] = useState<JiraUser>({});

  // State for user suggestions when searching
  const [userSuggestions, setUserSuggestions] = useState<JiraUser[]>([]);

  // State for required fields
  const [requiredFields, setRequiredFields] = useState<JiraField[]>([]);

  // Form values state
  const [formValues, setFormValues] = useState<FormValues>({
    project: "",
    issueType: "",
    summary: "",
    description: "",
    priority: "",
    saveDefaults: false,
    dynamicFields: {},
    userSearchQueries: {},
  });

  // --- Data Loading ---

  // 1. Load projects and current user on initial load
  useEffect(() => {
    async function initialLoad() {
      setIsLoading(true);
      try {
        // Load current user information
        const user = await jiraFetchObject<JiraUser>("/rest/api/2/myself");
        setCurrentUser(user);

        // Use function from project.ts to load projects
        const projectResults = await searchProjects("");

        // Load full project information, including avatars
        const fullProjects = await jiraFetchObject<Project[]>("/rest/api/2/project");

        // Merge data from searchProjects and full project information
        const mappedProjects = projectResults.map((p: Record<string, unknown>) => {
          const fullProject = fullProjects.find((fp) => fp.id === p.id);
          return {
            id: p.id as string,
            name: p.title as string,
            key: p.subtitle as string,
            avatarUrls: fullProject?.avatarUrls,
          };
        });

        setProjects(mappedProjects as Project[]);

        // Load saved default settings
        const defaultProjectId = await LocalStorage.getItem(DEFAULT_PROJECT_KEY);
        const defaultIssueType = await LocalStorage.getItem(DEFAULT_ISSUE_TYPE_KEY);
        const defaultPriority = await LocalStorage.getItem(DEFAULT_PRIORITY_KEY);

        if (defaultProjectId && mappedProjects.some((p: Record<string, unknown>) => p.id === defaultProjectId)) {
          // Set default project
          setFormValues((prev) => ({ ...prev, project: defaultProjectId as string }));

          // Load issue types for project
          const issueTypesList = await loadIssueTypes(defaultProjectId as string);
          setIssueTypes(issueTypesList);

          // If there's a saved issue type and it's available for this project
          if (defaultIssueType && issueTypesList.some((it) => it.id === defaultIssueType)) {
            setFormValues((prev) => ({ ...prev, issueType: defaultIssueType as string }));

            // Load required fields for selected issue type
            const project = mappedProjects.find((p: Record<string, unknown>) => p.id === defaultProjectId);
            if (project) {
              await loadFieldsFor(project.key as string, defaultIssueType as string, setRequiredFields);
            }
          } else if (issueTypesList.length > 0) {
            // If no saved issue type, use first available
            setFormValues((prev) => ({ ...prev, issueType: issueTypesList[0].id }));
          }

          // Load priorities
          const project = mappedProjects.find((p: Record<string, unknown>) => p.id === defaultProjectId);
          if (project) {
            setIsPriorityLoading(true);
            loadPrioritiesForProject(
              project.key as string,
              (defaultIssueType as string) || (issueTypesList.length > 0 ? issueTypesList[0].id : undefined),
              (loadedPriorities: Priority[]) => {
                setPriorities(loadedPriorities);

                // If there's a saved priority and it's available
                if (defaultPriority && loadedPriorities.some((p) => p.id === defaultPriority)) {
                  setFormValues((prev) => ({ ...prev, priority: defaultPriority as string }));
                } else if (loadedPriorities.length > 0) {
                  // Otherwise use first available
                  setFormValues((prev) => ({ ...prev, priority: loadedPriorities[0].id }));
                }

                setIsPriorityLoading(false);
              },
            ).catch(() => {
              setIsPriorityLoading(false);
            });
          }
        }
      } catch (error) {
        console.error("Failed to load initial data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    initialLoad();
  }, []);

  // --- Event Handlers ---

  const handleProjectChange = async (projectId: string) => {
    // Update form state
    setFormValues((prev) => ({ ...prev, project: projectId, issueType: "", priority: "" }));
    setIssueTypes([]);

    if (projectId) {
      try {
        // Load issue types for the project
        const issueTypesList = await loadIssueTypes(projectId);
        setIssueTypes(issueTypesList);

        // Load priorities for the project
        const project = projects.find((p) => p.id === projectId);
        if (project) {
          // If there are issue types, use the first one for more accurate priority loading
          const firstIssueType = issueTypesList.length > 0 ? issueTypesList[0].id : undefined;

          // Start loading priorities, but don't block the interface
          setIsPriorityLoading(true);
          loadPrioritiesForProject(project.key, firstIssueType, (loadedPriorities) => {
            setPriorities(loadedPriorities);
            setIsPriorityLoading(false);
          }).catch(() => {
            setIsPriorityLoading(false);
          });
        }
      } catch (error) {
        console.error("Error in handleProjectChange:", error);
      }
    }
  };

  const handleIssueTypeChange = async (issueTypeId: string) => {
    // Update form state
    setFormValues((prev) => ({ ...prev, issueType: issueTypeId }));

    // Load field metadata for the selected issue type
    if (formValues.project && issueTypeId) {
      const project = projects.find((p) => p.id === formValues.project);
      if (project) {
        try {
          // First load required fields
          await loadFieldsFor(project.key, issueTypeId, setRequiredFields);

          // Load priorities for the specific issue type
          setIsPriorityLoading(true);
          loadPrioritiesForProject(project.key, issueTypeId, (loadedPriorities) => {
            setPriorities(loadedPriorities);
            setIsPriorityLoading(false);
          }).catch(() => {
            setIsPriorityLoading(false);
          });
        } catch (error) {
          console.error("Error in handleIssueTypeChange:", error);
        }
      }
    }
  };

  const handleUserSearch = (query: string, fieldId: string) => {
    setFormValues((prev) => ({
      ...prev,
      userSearchQueries: { ...prev.userSearchQueries, [fieldId]: query },
    }));
    searchUsers(query, fieldId, requiredFields, setUserSuggestions);
  };

  const handleSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      // Save default settings if the option is selected
      if (values.saveDefaults) {
        await LocalStorage.setItem(DEFAULT_PROJECT_KEY, values.project);
        await LocalStorage.setItem(DEFAULT_ISSUE_TYPE_KEY, values.issueType);
        await LocalStorage.setItem(DEFAULT_PRIORITY_KEY, values.priority);
        showToast({ style: Toast.Style.Success, title: "Default settings saved" });
      }

      await createIssue(values, projects, requiredFields, currentUser);
      pop();
    } catch (error) {
      // Error handling is done inside createIssue function
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPriorities = () => {
    const project = projects.find((p) => p.id === formValues.project);
    if (project) {
      resetPriorityCache(project.key);
      setIsPriorityLoading(true);
      loadPrioritiesForProject(project.key, formValues.issueType, (loadedPriorities) => {
        setPriorities(loadedPriorities);
        setIsPriorityLoading(false);
      }).catch(() => {
        setIsPriorityLoading(false);
      });
    }
  };

  // --- Render ---
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Issue" onSubmit={handleSubmit} icon={Icon.Plus} />
          <Action title="Refresh Priorities" onAction={refreshPriorities} icon={Icon.ArrowClockwise} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="project" title="Project" value={formValues.project} onChange={handleProjectChange}>
        {projects.map((p) => (
          <Form.Dropdown.Item
            key={p.id}
            value={p.id}
            title={p.name}
            icon={p.avatarUrls?.["48x48"] ? { source: p.avatarUrls["48x48"] } : Icon.Document}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="issueType" title="Issue Type" value={formValues.issueType} onChange={handleIssueTypeChange}>
        {issueTypes.map((type) => (
          <Form.Dropdown.Item
            key={type.id}
            value={type.id}
            title={type.name}
            icon={type.iconUrl ? { source: type.iconUrl } : Icon.Circle}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="summary"
        title="Summary"
        placeholder="Enter issue summary"
        value={formValues.summary}
        onChange={(value) => setFormValues((prev) => ({ ...prev, summary: value }))}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Enter issue description"
        value={formValues.description}
        onChange={(value) => setFormValues((prev) => ({ ...prev, description: value }))}
      />

      <PriorityField
        priorities={priorities}
        value={formValues.priority}
        onChange={(value) => setFormValues((prev) => ({ ...prev, priority: value }))}
        isLoading={isPriorityLoading}
      />

      {/* Dynamic fields based on issue type */}
      {formValues.project && formValues.issueType && (
        <DynamicFields
          fields={requiredFields}
          values={formValues.dynamicFields}
          onChange={(fieldId, value) =>
            setFormValues((prev) => ({
              ...prev,
              dynamicFields: { ...prev.dynamicFields, [fieldId]: value },
            }))
          }
          onUserSearch={handleUserSearch}
          userSuggestions={userSuggestions}
          currentUser={currentUser}
        />
      )}

      <Form.Checkbox
        id="saveDefaults"
        label="Save current project, issue type and priority as defaults"
        value={formValues.saveDefaults}
        onChange={(value) => setFormValues((prev) => ({ ...prev, saveDefaults: value }))}
      />
    </Form>
  );
}
