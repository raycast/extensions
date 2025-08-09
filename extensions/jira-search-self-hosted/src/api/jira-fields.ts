import { jiraFetchObject } from "../jira";
import { JiraField, JiraUser } from "../types/jira-types";

/**
 * Loads required fields for a specific project and issue type
 * Uses multiple methods with fallback strategies
 * @param projectKey Project key
 * @param issueTypeId Issue type ID
 * @param setRequiredFields Function to set required fields in component state
 * @returns Object with field metadata
 */
export async function loadFieldsFor(
  projectKey: string,
  issueTypeId: string,
  setRequiredFields?: (fields: JiraField[]) => void,
): Promise<Record<string, unknown>> {
  try {
    // Try to use the more detailed API first
    try {
      const meta = await jiraFetchObject<Record<string, unknown>>(
        `/rest/api/2/issue/createmeta?projectKeys=${projectKey}&issuetypeIds=${issueTypeId}&expand=projects.issuetypes.fields`,
      );

      const projects = meta.projects as Array<Record<string, unknown>> | undefined;
      if (
        projects &&
        projects.length > 0 &&
        projects[0].issuetypes &&
        Array.isArray(projects[0].issuetypes) &&
        projects[0].issuetypes.length > 0
      ) {
        // Get fields from metadata
        const fields = (projects[0].issuetypes[0].fields as Record<string, unknown>) || {};

        // Extract required fields (except standard fields and reporter, which are already in the form)
        const standardFields = ["summary", "description", "project", "issuetype", "priority", "reporter"];

        // Convert fields object to array and filter required fields
        const requiredFieldsList = Object.entries(fields)
          .map(([fieldId, fieldData]) => ({
            fieldId,
            ...(fieldData as Record<string, unknown>),
            schema: (fieldData as Record<string, unknown>).schema || {},
            required: Boolean((fieldData as Record<string, unknown>).required),
          }))
          .filter((field) => field.required && !standardFields.includes(field.fieldId));

        if (setRequiredFields) {
          setRequiredFields(requiredFieldsList as JiraField[]);
        }

        return fields as Record<string, unknown>;
      }
    } catch (error) {
      console.warn("Failed to use createmeta API, falling back to create screens API");
    }

    // If the first method failed, use an alternative API to get fields through creation screens
    const createScreens = await jiraFetchObject<Record<string, unknown>>(
      `/rest/api/2/issue/createmeta/${projectKey}/issuetypes/${issueTypeId}`,
    );

    const values = createScreens?.values as Array<Record<string, unknown>> | undefined;
    if (!values) {
      if (setRequiredFields) {
        setRequiredFields([]);
      }
      return {};
    }

    // Collect all fields from values
    const allFields: JiraField[] = [];
    values.forEach((field) => {
      if (field.required && field.fieldId) {
        allFields.push({
          fieldId: String(field.fieldId),
          name: field.name ? String(field.name) : String(field.fieldId),
          required: Boolean(field.required),
          schema: (field.schema as Record<string, unknown>) || { type: "string" },
          allowedValues: field.allowedValues as unknown[],
        });
      }
    });

    // Filter standard fields
    const standardFields = ["summary", "description", "project", "issuetype", "priority", "reporter"];
    const requiredFieldsList = allFields.filter((field) => !standardFields.includes(field.fieldId));

    console.warn("Required fields from screens:", requiredFieldsList);
    if (setRequiredFields) {
      setRequiredFields(requiredFieldsList);
    }

    return requiredFieldsList.reduce((acc: Record<string, unknown>, field: JiraField) => {
      acc[field.fieldId] = field;
      return acc;
    }, {});
  } catch (error) {
    console.error(`Failed to load fields for projectKey=${projectKey}, issueTypeId=${issueTypeId}:`, error);

    // Last attempt - use API to get project fields
    try {
      const projectFields = await jiraFetchObject<unknown[]>(`/rest/api/2/field`);

      if (Array.isArray(projectFields)) {
        const customFields = projectFields.filter(
          (field) =>
            typeof field === "object" &&
            field !== null &&
            "custom" in field &&
            "required" in field &&
            "schema" in field &&
            Boolean((field as Record<string, unknown>).required),
        );

        if (setRequiredFields) {
          setRequiredFields(
            customFields.map((field) => ({
              fieldId: String((field as Record<string, unknown>).id),
              name: String((field as Record<string, unknown>).name),
              required: Boolean((field as Record<string, unknown>).required),
              schema: (field as Record<string, unknown>).schema as Record<string, unknown>,
            })),
          );
        }

        return customFields.reduce((acc: Record<string, unknown>, field) => {
          if (typeof field === "object" && field !== null && "id" in field) {
            acc[String(field.id)] = field;
          }
          return acc;
        }, {});
      }
    } catch (e) {
      console.error("Failed to load fields from /rest/api/2/field:", e);
    }

    console.error("Could not load required fields");
    if (setRequiredFields) {
      setRequiredFields([]);
    }
    return {};
  }
}

/**
 * Searches for users based on query
 * Uses multiple methods with fallback strategies
 * @param query Search query
 * @param fieldId Field ID for context-specific search
 * @param requiredFields Array of field metadata
 * @param setUserSuggestions Function to set user suggestions in component state
 */
export async function searchUsers(
  query: string,
  fieldId: string,
  requiredFields: JiraField[],
  setUserSuggestions: (users: JiraUser[]) => void,
): Promise<void> {
  if (!query || query.length < 2) {
    setUserSuggestions([]);
    return;
  }

  try {
    const field = requiredFields.find((f) => f.fieldId === fieldId);

    // Immediately use the backup method that works more reliably
    try {
      const searchUrl = `/rest/api/2/user/picker?query=${encodeURIComponent(query)}`;
      const response = await jiraFetchObject<Record<string, unknown>>(searchUrl);

      if (response && Array.isArray(response.users)) {
        const users = response.users as Record<string, unknown>[];

        setUserSuggestions(
          users.map((user) => ({
            id: String(user.key || user.name || ""),
            displayName: String(user.displayName || user.name || ""),
            avatarUrls: user.avatarUrls as Record<string, string>,
          })),
        );
        return;
      }
    } catch (e) {
      // Silently proceed to next method
    }

    // If the first method failed and the field has its own autocomplete URL, use it
    if (field?.autoCompleteUrl) {
      try {
        const autoCompleteUrl = String(field.autoCompleteUrl);
        const baseUrl = autoCompleteUrl.split("?")[0];

        let searchUrl;
        if (autoCompleteUrl.includes("username=")) {
          searchUrl = `${baseUrl}?username=${encodeURIComponent(query)}`;
        } else if (autoCompleteUrl.includes("query=")) {
          searchUrl = `${baseUrl}?query=${encodeURIComponent(query)}`;
        } else {
          searchUrl = `${baseUrl}?query=${encodeURIComponent(query)}`;
        }

        const response = await jiraFetchObject<unknown>(searchUrl);

        const users = Array.isArray(response)
          ? response
          : typeof response === "object" && response !== null && "users" in response
          ? (response.users as unknown[])
          : [];

        setUserSuggestions(
          users.map((user) => {
            if (typeof user !== "object" || user === null) return { id: "", displayName: "" };
            const u = user as Record<string, unknown>;
            return {
              id: String(u.accountId || u.key || u.name || ""),
              displayName: String(u.displayName || u.name || ""),
              avatarUrls: u.avatarUrls as Record<string, string>,
            };
          }),
        );
        return;
      } catch (e) {
        console.error("Field-specific user search failed:", e);
      }
    }

    // If all methods failed, try the standard API
    const searchUrl = `/rest/api/2/user/search?query=${encodeURIComponent(query)}`;
    const response = await jiraFetchObject<unknown>(searchUrl);

    const users = Array.isArray(response)
      ? response
      : typeof response === "object" && response !== null && "users" in response
      ? (response.users as unknown[])
      : [];

    setUserSuggestions(
      users.map((user) => {
        if (typeof user !== "object" || user === null) return { id: "", displayName: "" };
        const u = user as Record<string, unknown>;
        return {
          id: String(u.accountId || u.key || u.name || ""),
          displayName: String(u.displayName || u.name || ""),
          avatarUrls: u.avatarUrls as Record<string, string>,
        };
      }),
    );
  } catch (error) {
    console.error("All user search methods failed:", error);
    setUserSuggestions([]);
  }
}
