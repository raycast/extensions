/**
 * Jira API integration for Dynatrace extension
 *
 * Supports both:
 * - Unscoped API tokens: https://mysite.atlassian.net
 * - Scoped API tokens: https://api.atlassian.com/ex/jira/{cloudId}
 *
 * Reference: https://jira.atlassian.com/browse/CLOUD-12617
 */

export interface JiraIssueParams {
  summary: string;
  description: string;
  issueType: "Bug" | "Incident" | "Task";
  projectKey: string;
  priority: "Highest" | "High" | "Medium" | "Low" | "Lowest";
}

export interface JiraIssueResponse {
  key: string;
  id: string;
  self: string;
}

export class JiraError extends Error {
  constructor(
    public statusCode: number,
    public body: string,
  ) {
    super(`Jira API error: ${statusCode}`);
  }
}

/**
 * Map issue type name to ID for Jira API
 * Scoped tokens require using issue type IDs instead of names
 *
 * @param issueTypeName - Issue type name (e.g., "Bug", "Task", "Story")
 * @returns Issue type ID string
 */
function getIssueTypeId(issueTypeName: string): string {
  const issueTypeMap: Record<string, string> = {
    Bug: "10011",
    Task: "10003", // or 10007
    Story: "10004", // or 10008
    Feature: "10009",
    Request: "10010",
    Epic: "10005", // or 10001, 10000
    Incident: "10003", // fallback to Task
  };

  return issueTypeMap[issueTypeName] || issueTypeName; // fallback to original if not found
}

/**
 * Determine if URL is a scoped API token format
 * @param jiraUrl - Base Jira URL
 * @returns true if URL matches scoped token format (api.atlassian.com/ex/jira/{cloudId})
 */
function isScopedTokenUrl(jiraUrl: string): boolean {
  return jiraUrl.includes("api.atlassian.com/ex/jira");
}

/**
 * Get the correct API endpoint based on token type
 * @param jiraUrl - Base Jira URL (either mysite.atlassian.net or api.atlassian.com/ex/jira/{cloudId})
 * @returns Full API endpoint URL
 */
function getJiraApiEndpoint(jiraUrl: string): string {
  const cleanUrl = jiraUrl.replace(/\/$/, "");

  if (isScopedTokenUrl(cleanUrl)) {
    // Scoped token format: https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/issue
    return `${cleanUrl}/rest/api/3/issue`;
  }

  // Unscoped token format: https://mysite.atlassian.net/rest/api/3/issue
  return `${cleanUrl}/rest/api/3/issue`;
}

/**
 * Create a Jira issue
 *
 * @param jiraUrl - Base Jira URL. Can be:
 *   - Unscoped: https://mysite.atlassian.net
 *   - Scoped: https://api.atlassian.com/ex/jira/{cloudId}
 * @param email - Jira email address
 * @param apiToken - Jira API token (scoped or unscoped)
 * @param params - Issue parameters
 * @returns Issue response with key, id, and self URL
 */
export async function createJiraIssue(
  jiraUrl: string,
  email: string,
  apiToken: string,
  params: JiraIssueParams,
): Promise<JiraIssueResponse> {
  // Detect token type
  const tokenType = isScopedTokenUrl(jiraUrl) ? "scoped" : "unscoped";
  const endpoint = getJiraApiEndpoint(jiraUrl);

  // Debug logging
  console.log("[Jira API Debug]");
  console.log(`  Base URL: ${jiraUrl}`);
  console.log(`  Token Type: ${tokenType}`);
  console.log(`  Endpoint: ${endpoint}`);
  console.log(`  Project Key: ${params.projectKey}`);
  console.log(`  Issue Type: ${params.issueType}`);
  console.log(`  Priority: ${params.priority}`);
  console.log(`  Summary length: ${params.summary.length}`);
  console.log(`  Description length: ${params.description.length}`);

  // Build request body in Jira REST API format
  // Description must be in ADF (Atlassian Document Format) version 1
  const body = {
    fields: {
      project: { key: params.projectKey },
      summary: params.summary,
      description: {
        version: 1,
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: params.description }],
          },
        ],
      },
      // Use issue type ID instead of name for scoped tokens
      // Bug = 10011, Task = 10003/10007, Story = 10004/10008, Feature = 10009
      issuetype: { id: getIssueTypeId(params.issueType) },
      // Priority field for the issue
      priority: { name: params.priority },
    },
  };

  // Basic Auth: base64(email:apiToken)
  const authString = `${email}:${apiToken}`;
  const authHeader = Buffer.from(authString).toString("base64");

  console.log("[Jira API Authentication]");
  console.log(`  Method: Basic Auth (unscoped token)`);
  console.log(`  Email: ${email}`);
  console.log(`  Token (first 10 chars): ${apiToken.substring(0, 10)}...`);
  console.log(`  Auth String: ${authString.substring(0, 30)}...`);
  console.log(`  Base64 Auth (first 30 chars): ${authHeader.substring(0, 30)}...`);
  console.log(`  Full Base64: ${authHeader}`);

  console.log("[Jira API Request Headers]");
  console.log(`  Authorization: Basic ${authHeader.substring(0, 20)}...`);
  console.log(`  Content-Type: application/json`);
  console.log(`  Email: ${email}`);

  console.log("[Jira API Request Body]");
  console.log(JSON.stringify(body, null, 2));

  console.log("[Jira API Request Details]");
  console.log(`  Method: POST`);
  console.log(`  Content-Type: application/json`);
  console.log(`  Body size: ${JSON.stringify(body).length} bytes`);
  console.log(`  Full Auth Header: ${authHeader}`);
  console.log(`  Full Request URL: ${endpoint}`);

  // Log what we're actually sending
  const requestLog = {
    url: endpoint,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader.substring(0, 20)}...`,
    },
    body: body,
  };
  console.log("[Jira API Full Request Object]");
  console.log(JSON.stringify(requestLog, null, 2));

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    console.log("[Jira API Response]");
    console.log(`  Status: ${response.status}`);
    console.log(`  Status Text: ${response.statusText}`);

    if (!response.ok) {
      console.log("[Jira API Error Response]");
      console.log(`  Body: ${responseText}`);

      // Try to parse error details if it's JSON
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.errorMessages) {
          console.log("[Jira API Error Messages]");
          errorData.errorMessages.forEach((msg: string) => console.log(`  - ${msg}`));
        }
        if (errorData.errors) {
          console.log("[Jira API Errors]");
          console.log(`  ${JSON.stringify(errorData.errors, null, 2)}`);
        }
      } catch {
        // Response wasn't JSON, already logged the body
      }

      throw new JiraError(response.status, responseText);
    }

    const data = JSON.parse(responseText);

    console.log("[Jira API Success]");
    console.log(`  Issue Key: ${data.key}`);
    console.log(`  Issue ID: ${data.id}`);

    return {
      key: data.key,
      id: data.id,
      self: data.self,
    };
  } catch (error) {
    if (error instanceof JiraError) {
      console.log("[Jira API Exception]");
      console.log(`  Status Code: ${error.statusCode}`);
      console.log(`  Message: ${error.message}`);
      throw error;
    }

    console.log("[Jira API Unexpected Error]");
    console.log(`  Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    throw new Error(`Failed to create Jira issue: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generate Jira issue URL from the "self" URL returned by API
 * This is the most reliable way to get the correct browse URL
 *
 * @param selfUrl - The "self" URL from Jira API response (includes full path to REST API)
 * @param issueKey - Issue key (e.g., "KAN-1")
 * @returns Correct Jira browse URL
 *
 * @example
 * // API returns: https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/issue/10000
 * // or: https://mysite.atlassian.net/rest/api/3/issue/10000
 * // Returns: https://mysite.atlassian.net/browse/KAN-1
 */
export function buildJiraIssueUrl(selfUrl: string, issueKey: string): string {
  try {
    const url = new URL(selfUrl);

    // For scoped tokens: https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/issue/...
    if (url.hostname === "api.atlassian.com") {
      // Extract organization domain from email during token test
      // For now, we'll use a fallback approach: get organization from Jira settings
      // The browse URL for scoped tokens should be: https://yourorg.atlassian.net/browse/KEY
      // We need to fetch this - for now return a placeholder
      return `https://yourorganization.atlassian.net/browse/${issueKey}`;
    }

    // For unscoped tokens: https://mysite.atlassian.net/rest/api/3/issue/...
    // Extract base URL and append browse path
    const baseUrl = `${url.protocol}//${url.hostname}`;
    return `${baseUrl}/browse/${issueKey}`;
  } catch {
    // Fallback if URL parsing fails
    return `https://atlassian.net/browse/${issueKey}`;
  }
}

/**
 * Validate and diagnose Jira configuration
 * Useful for debugging configuration issues
 *
 * @param jiraUrl - Base Jira URL
 * @param email - Jira email
 * @param apiToken - Jira API token
 * @param projectKey - Jira project key
 * @returns Diagnostic report
 */
export function validateJiraConfig(
  jiraUrl: string | undefined,
  email: string | undefined,
  apiToken: string | undefined,
  projectKey: string | undefined,
): {
  isComplete: boolean;
  issues: string[];
  tokenType?: string;
  endpoint?: string;
} {
  const issues: string[] = [];

  if (!jiraUrl) {
    issues.push("Jira URL is not configured");
  } else {
    const tokenType = isScopedTokenUrl(jiraUrl) ? "scoped" : "unscoped";
    console.log(`[Jira Config Validation] Token Type: ${tokenType}`);
    console.log(`[Jira Config Validation] Base URL: ${jiraUrl}`);

    if (tokenType === "scoped") {
      if (!jiraUrl.includes("api.atlassian.com/ex/jira/")) {
        issues.push("Scoped token URL should include 'api.atlassian.com/ex/jira/'");
      }
      const cloudIdMatch = jiraUrl.match(/api\.atlassian\.com\/ex\/jira\/([a-zA-Z0-9-]+)/);
      if (cloudIdMatch && cloudIdMatch[1]) {
        console.log(`[Jira Config Validation] Cloud ID: ${cloudIdMatch[1]}`);
      } else {
        issues.push("Scoped token URL missing Cloud ID. Expected: https://api.atlassian.com/ex/jira/{cloudId}");
      }
    } else {
      if (!jiraUrl.match(/https?:\/\/[a-zA-Z0-9-]+\.atlassian\.net/)) {
        issues.push("Unscoped token URL should be: https://yoursite.atlassian.net");
      }
    }
  }

  if (!email) {
    issues.push("Jira email is not configured");
  } else {
    console.log(`[Jira Config Validation] Email: ${email}`);
  }

  if (!apiToken) {
    issues.push("Jira API token is not configured");
  } else {
    console.log(`[Jira Config Validation] API Token: ${apiToken.substring(0, 10)}...`);
  }

  if (!projectKey) {
    issues.push("Jira project key is not configured");
  } else {
    console.log(`[Jira Config Validation] Project Key: ${projectKey}`);
  }

  const isComplete = issues.length === 0;

  console.log("[Jira Config Validation] Summary");
  console.log(`  Configuration Complete: ${isComplete}`);
  console.log(`  Issues Found: ${issues.length}`);
  issues.forEach((issue) => console.log(`    - ${issue}`));

  return {
    isComplete,
    issues,
    tokenType: jiraUrl ? (isScopedTokenUrl(jiraUrl) ? "scoped" : "unscoped") : undefined,
    endpoint: jiraUrl ? getJiraApiEndpoint(jiraUrl) : undefined,
  };
}

/**
 * Get available issue types for a project
 * Useful for debugging which issue types are available
 *
 * @param jiraUrl - Base Jira URL
 * @param email - Jira email
 * @param apiToken - Jira API token
 * @param projectKey - Project key (e.g., "KAN")
 * @returns List of available issue types
 */
export async function getProjectIssueTypes(
  jiraUrl: string,
  email: string,
  apiToken: string,
  projectKey: string,
): Promise<{
  success: boolean;
  issueTypes?: Array<{ id: string; name: string }>;
  error?: string;
}> {
  const cleanUrl = jiraUrl.replace(/\/$/, "");
  const endpoint = `${cleanUrl}/rest/api/3/project/${projectKey}/issuetypes`;

  console.log("[Jira Get Issue Types]");
  console.log(`  Endpoint: ${endpoint}`);
  console.log(`  Project Key: ${projectKey}`);

  const authHeader = Buffer.from(`${email}:${apiToken}`).toString("base64");

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.log("[Jira Get Issue Types Error]");
      console.log(`  Status: ${response.status}`);
      console.log(`  Body: ${responseText}`);
      return {
        success: false,
        error: `Failed to get issue types: ${response.status}`,
      };
    }

    const data = JSON.parse(responseText);
    const issueTypes = data.map((type: { id: string; name: string }) => ({
      id: type.id,
      name: type.name,
    }));

    console.log("[Jira Get Issue Types Success]");
    issueTypes.forEach((type: { id: string; name: string }) => {
      console.log(`  - ${type.name} (ID: ${type.id})`);
    });

    return {
      success: true,
      issueTypes,
    };
  } catch (error) {
    console.log("[Jira Get Issue Types Exception]");
    console.log(`  Error: ${error instanceof Error ? error.message : "Unknown"}`);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Test if API token works with a simple authenticated request
 * Useful for diagnosing token permission issues
 *
 * @param jiraUrl - Base Jira URL
 * @param email - Jira email
 * @param apiToken - Jira API token
 * @returns Test result
 */
export async function testJiraApiToken(
  jiraUrl: string,
  email: string,
  apiToken: string,
): Promise<{
  success: boolean;
  status?: number;
  message: string;
  details?: Record<string, unknown>;
}> {
  const cleanUrl = jiraUrl.replace(/\/$/, "");
  const testEndpoint = `${cleanUrl}/rest/api/3/myself`;

  console.log("[Jira API Token Test]");
  console.log(`  Testing endpoint: ${testEndpoint}`);
  console.log(`  Email: ${email}`);

  const authHeader = Buffer.from(`${email}:${apiToken}`).toString("base64");

  console.log("[Jira API Token Test Request]");
  console.log(`  Method: GET`);
  console.log(`  Authorization: Basic ${authHeader.substring(0, 30)}...`);
  console.log(`  Full Auth Header: ${authHeader}`);
  console.log(`  Content-Type: application/json`);

  try {
    const response = await fetch(testEndpoint, {
      method: "GET",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();

    console.log("[Jira API Token Test Response]");
    console.log(`  Status: ${response.status}`);
    console.log(`  Status Text: ${response.statusText}`);
    console.log(`  Response Headers:`);
    response.headers.forEach((value, name) => {
      console.log(`    ${name}: ${value.substring(0, 50)}${value.length > 50 ? "..." : ""}`);
    });
    console.log(`  Response Body: ${responseText}`);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log("[Jira API Token Test Success]");
      console.log(`  User: ${data.displayName}`);
      console.log(`  Email: ${data.emailAddress}`);

      return {
        success: true,
        status: response.status,
        message: `Token is valid. Logged in as: ${data.displayName}`,
        details: {
          name: data.displayName,
          email: data.emailAddress,
          accountId: data.accountId,
        },
      };
    } else {
      console.log("[Jira API Token Test Failed]");
      console.log(`  Response: ${responseText}`);

      return {
        success: false,
        status: response.status,
        message: `Token test failed with status ${response.status}`,
        details: {
          responseText,
        },
      };
    }
  } catch (error) {
    console.log("[Jira API Token Test Error]");
    console.log(`  Error: ${error instanceof Error ? error.message : "Unknown error"}`);

    return {
      success: false,
      message: `Token test error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Get the correct Jira browse URL for an issue
 * Handles both scoped and unscoped token formats
 *
 * @param jiraUrl - Base Jira URL
 * @param issueKey - Issue key (e.g., "KAN-1")
 * @param email - Jira email
 * @param apiToken - Jira API token
 * @returns Issue browse URL
 */
export async function getJiraIssueBrowseUrl(
  jiraUrl: string,
  issueKey: string,
  email: string,
  apiToken: string,
): Promise<string> {
  const cleanUrl = jiraUrl.replace(/\/$/, "");

  // For unscoped tokens, just use the base URL directly
  if (!cleanUrl.includes("api.atlassian.com/ex/jira")) {
    return `${cleanUrl}/browse/${issueKey}`;
  }

  // For scoped tokens, we need to get the organization URL from the API
  try {
    const authHeader = Buffer.from(`${email}:${apiToken}`).toString("base64");
    const endpoint = `${cleanUrl}/rest/api/3/myself`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      // The emailAddress contains the organization, e.g., "user@organization.atlassian.net"
      if (data.emailAddress) {
        const domain = data.emailAddress.split("@")[1];
        if (domain && domain.includes("atlassian.net")) {
          const organizationUrl = `https://${domain}`;
          return `${organizationUrl}/browse/${issueKey}`;
        }
      }
    }
  } catch (error) {
    console.log("[Jira Get Browse URL Error]");
    console.log(`  Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  // Fallback: try to construct from cloud ID
  const cloudIdMatch = cleanUrl.match(/api\.atlassian\.com\/ex\/jira\/([a-zA-Z0-9-]+)/);
  if (cloudIdMatch && cloudIdMatch[1]) {
    // This is a best-guess approach - we'll need the organization name
    // For now, return a URL that Jira might redirect correctly
    return `https://atlassian.net/browse/${issueKey}`;
  }

  // Final fallback
  return `${cleanUrl}/browse/${issueKey}`;
}
