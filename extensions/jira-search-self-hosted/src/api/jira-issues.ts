import { showToast, Toast, open, LocalStorage } from "@raycast/api";
import { jiraFetchObject, jiraUrl } from "../jira";
import { CreateIssueResponse, JiraField, Project, FormValues } from "../types/jira-types";

// Keys for storing default settings
const DEFAULT_PROJECT_KEY = "defaultProject";
const DEFAULT_ISSUE_TYPE_KEY = "defaultIssueType";
const DEFAULT_PRIORITY_KEY = "defaultPriority";

/**
 * Validates form data before creating an issue
 * @param formValues Form values to validate
 * @param requiredFields Array of required fields
 * @returns Boolean indicating if the form is valid
 */
export function validateIssueForm(formValues: FormValues, requiredFields: JiraField[]): boolean {
  // Check required standard fields
  if (!formValues.project) {
    showToast({ style: Toast.Style.Failure, title: "Project is required" });
    return false;
  }

  if (!formValues.issueType) {
    showToast({ style: Toast.Style.Failure, title: "Issue Type is required" });
    return false;
  }

  if (!formValues.summary) {
    showToast({ style: Toast.Style.Failure, title: "Summary is required" });
    return false;
  }

  // Check required custom fields
  for (const field of requiredFields) {
    const value = formValues.dynamicFields[field.fieldId];

    if (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0)
    ) {
      showToast({
        style: Toast.Style.Failure,
        title: `${field.name} is required`,
        message: "Please fill in all required fields",
      });
      return false;
    }
  }

  return true;
}

/**
 * Creates a new issue in Jira
 * @param formValues Form values for the new issue
 * @param projects List of available projects
 * @param requiredFields Array of required fields
 * @param currentUser Current user information
 * @returns Promise resolving to the created issue response
 */
export async function createIssue(
  formValues: FormValues,
  projects: Project[],
  requiredFields: JiraField[],
  currentUser: { accountId?: string },
): Promise<CreateIssueResponse> {
  // First validate the form
  if (!validateIssueForm(formValues, requiredFields)) {
    throw new Error("Form validation failed");
  }

  try {
    const project = projects.find((p) => p.id === formValues.project);
    if (!project) throw new Error("Selected project not found.");

    // Save default settings if option is selected
    if (formValues.saveDefaults) {
      await LocalStorage.setItem(DEFAULT_PROJECT_KEY, formValues.project);
      await LocalStorage.setItem(DEFAULT_ISSUE_TYPE_KEY, formValues.issueType);
      await LocalStorage.setItem(DEFAULT_PRIORITY_KEY, formValues.priority);
      showToast({
        style: Toast.Style.Success,
        title: "Default Settings Saved",
        message: `${project.name} settings saved as default`,
      });
    }

    // Prepare dynamic fields for the request
    const dynamicFieldsData: Record<string, unknown> = {};

    if (formValues.dynamicFields) {
      Object.entries(formValues.dynamicFields).forEach(([fieldId, value]) => {
        if (value === null || value === undefined) {
          return;
        }

        // Find field metadata to determine its type
        const fieldMeta = requiredFields.find((f) => f.fieldId === fieldId);

        if (!fieldMeta) {
          return;
        }

        // Determine field type from schema
        const fieldType = fieldMeta.schema?.type;

        // Transform value to the required format based on field type
        if (fieldType === "user" && typeof value === "object" && value !== null && "id" in value) {
          // For user fields, send an object with id
          dynamicFieldsData[fieldId] = { id: value.id };
        } else if (fieldType === "array" && Array.isArray(value)) {
          // For arrays (e.g., multi-select)
          dynamicFieldsData[fieldId] = value.map((item) =>
            typeof item === "object" && item !== null && "id" in item ? { id: item.id } : item,
          );
        } else {
          // For other types, just pass the value as is
          dynamicFieldsData[fieldId] = value;
        }
      });
    }

    const issueData = {
      fields: {
        project: { id: formValues.project },
        summary: formValues.summary,
        description: formValues.description,
        issuetype: { id: formValues.issueType },
        ...(formValues.priority && { priority: { id: formValues.priority } }),
        // Add current user as Reporter
        ...(currentUser.accountId && { reporter: { id: currentUser.accountId } }),
        ...dynamicFieldsData, // Add dynamic fields
      },
    };

    const response = await jiraFetchObject<CreateIssueResponse>("/rest/api/2/issue", {}, {}, "POST", issueData);

    showToast({ style: Toast.Style.Success, title: "Issue Created", message: `Issue ${response.key} created` });
    open(`${jiraUrl}/browse/${response.key}`);
    return response;
  } catch (error) {
    console.error("Failed to create issue:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to Create Issue",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
