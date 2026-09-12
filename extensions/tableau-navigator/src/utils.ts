import { getPreferenceValues, LocalStorage } from "@raycast/api";
// import fetch, { Headers } from "node-fetch"; // Make sure node-fetch v3 is installed
import { TableauView, TableauWorkbook, ApiError, RaycastPreferences } from "./types"; // RaycastPreferences imported

export const PREFERENCES_MISSING_ERROR = "PreferencesMissingError";
export const AUTH_CREDENTIALS_MISSING_ERROR = "AuthCredentialsMissingError";

interface StoredPrefs {
  tableauServerUrl?: string;
  tableauApiVersion?: string;
  personalAccessTokenName?: string;
  personalAccessTokenSecret?: string;
  tableauSiteId?: string; // This is the site's contentUrl
}

type EffectivePreferences = Required<
  Pick<StoredPrefs, "tableauServerUrl" | "tableauApiVersion" | "personalAccessTokenName" | "personalAccessTokenSecret">
> & {
  tableauSiteId?: string;
};

async function getEffectivePreferences(): Promise<EffectivePreferences> {
  const lsPrefs: StoredPrefs = {
    tableauServerUrl: await LocalStorage.getItem<string>("tableauServerUrlPref"),
    tableauApiVersion: await LocalStorage.getItem<string>("tableauApiVersionPref"),
    personalAccessTokenName: await LocalStorage.getItem<string>("personalAccessTokenNamePref"),
    personalAccessTokenSecret: await LocalStorage.getItem<string>("personalAccessTokenSecretPref"),
    tableauSiteId: await LocalStorage.getItem<string>("tableauSiteIdPref"),
  };

  const raycastPrefs = getPreferenceValues<RaycastPreferences>();

  const serverUrl = lsPrefs.tableauServerUrl || raycastPrefs.tableauServerUrl;
  const apiVersion = lsPrefs.tableauApiVersion || raycastPrefs.tableauApiVersion;
  const patName = lsPrefs.personalAccessTokenName || raycastPrefs.personalAccessTokenName;
  const patSecret = lsPrefs.personalAccessTokenSecret || raycastPrefs.personalAccessTokenSecret;
  const siteId = lsPrefs.tableauSiteId || raycastPrefs.tableauSiteId;

  if (!serverUrl || !apiVersion) {
    console.error("Server URL or API Version is missing.");
    throw new Error(PREFERENCES_MISSING_ERROR);
  }
  if (!patName || !patSecret) {
    console.error("PAT Name or Secret is missing.");
    throw new Error(AUTH_CREDENTIALS_MISSING_ERROR);
  }

  return {
    tableauServerUrl: serverUrl,
    tableauApiVersion: apiVersion,
    personalAccessTokenName: patName,
    personalAccessTokenSecret: patSecret,
    tableauSiteId: siteId || "", // Ensure that siteId is always a string (empty for Default)
  };
}

export async function getTableauAuthToken(): Promise<{ token: string; siteLuid: string }> {
  try {
    const effectivePrefs = await getEffectivePreferences();
    const siteContentUrl = effectivePrefs.tableauSiteId || ""; // Empty string for Default site

    // console.log("Requesting new auth token for site:", siteContentUrl || "Default");

    // Use AbortController to create timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

    try {
      const response = await fetch(
        `${effectivePrefs.tableauServerUrl}/api/${effectivePrefs.tableauApiVersion}/auth/signin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            credentials: {
              personalAccessTokenName: effectivePrefs.personalAccessTokenName,
              personalAccessTokenSecret: effectivePrefs.personalAccessTokenSecret,
              site: { contentUrl: siteContentUrl },
            },
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId); // Clear timeout if request completes

      if (!response.ok) {
        // Clear tokens on error
        await LocalStorage.removeItem("tableauSessionToken");
        await LocalStorage.removeItem("tableauActualSiteId");
        await LocalStorage.setItem("lastConnectionSuccessful", "false");

        let errorDetail = "Unknown authentication error";
        try {
          const errorData = (await response.json()) as { error: ApiError };
          console.error("Tableau Auth Error JSON:", JSON.stringify(errorData, null, 2));
          errorDetail = `${errorData.error.summary} (Code: ${errorData.error.code}) - Detail: ${errorData.error.detail}`;
        } catch {
          errorDetail = `Status: ${response.status} - ${response.statusText}. Could not parse error response.`;
          console.error("Could not parse Tableau Auth Error response:");
        }

        // Save error message
        await LocalStorage.setItem("lastConnectionErrorMessage", errorDetail);
        throw new Error(`Tableau Authentication Failed: ${errorDetail}`);
      }

      const data = (await response.json()) as {
        credentials: { token: string; site: { id: string; contentUrl: string } };
      };

      if (!data.credentials || !data.credentials.token || !data.credentials.site || !data.credentials.site.id) {
        await LocalStorage.setItem("lastConnectionSuccessful", "false");
        throw new Error("Received invalid authentication response from Tableau server");
      }

      // console.log("Successfully obtained auth token");

      // Save the obtained token and successful connection status
      await LocalStorage.setItem("tableauSessionToken", data.credentials.token);
      await LocalStorage.setItem("tableauActualSiteId", data.credentials.site.id);
      await LocalStorage.setItem("lastConnectionSuccessful", "true");

      // If siteId is not specified but API returned it, save it
      if (!effectivePrefs.tableauSiteId && data.credentials.site.contentUrl) {
        await LocalStorage.setItem("tableauSiteIdPref", data.credentials.site.contentUrl);
      }

      return {
        token: data.credentials.token,
        siteLuid: data.credentials.site.id,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.error("Authentication request timed out");
        throw new Error("Authentication request timed out. Please check your server URL and network connection.");
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("Failed to get Tableau auth token:", error);
    await LocalStorage.setItem("lastConnectionSuccessful", "false");
    throw error;
  }
}

async function tableauApiRequest<T>(endpoint: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<T> {
  try {
    let sessionToken = await LocalStorage.getItem<string>("tableauSessionToken");
    let siteLuid = await LocalStorage.getItem<string>("tableauActualSiteId");
    const { tableauServerUrl, tableauApiVersion } = await getEffectivePreferences();

    // If no token or siteLuid, get a new token
    if (!sessionToken || !siteLuid) {
      // console.log("No auth token found, requesting new one...");
      const authResult = await getTableauAuthToken();
      sessionToken = authResult.token;
      siteLuid = authResult.siteLuid;

      // Save the obtained tokens (although getTableauAuthToken should already do this)
      await LocalStorage.setItem("tableauSessionToken", sessionToken);
      await LocalStorage.setItem("tableauActualSiteId", siteLuid);
    }

    // Function to execute request with current token
    const makeRequest = async (tokenToUse: string, currentSiteLuid: string): Promise<T> => {
      const requestUrl = `${tableauServerUrl}/api/${tableauApiVersion}/sites/${currentSiteLuid}${endpoint}`;

      const headers = new Headers({
        "X-Tableau-Auth": tokenToUse,
        Accept: "application/json",
      });
      if (method === "POST" && body) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(requestUrl, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        if (response.status === 401) {
          // If we get a 401, the token has expired or is invalid
          console.log("Token expired or invalid (401), requesting new one...");
          await LocalStorage.removeItem("tableauSessionToken");
          await LocalStorage.removeItem("tableauActualSiteId");

          // Try to get a new token and repeat the request
          const newAuthResult = await getTableauAuthToken();
          return makeRequest(newAuthResult.token, newAuthResult.siteLuid);
        }

        // Other API errors
        let errorDetail = "Unknown API error";
        try {
          const errorData = (await response.json()) as { error: ApiError };
          console.error("Tableau API Error JSON:", JSON.stringify(errorData, null, 2));
          errorDetail = `${errorData.error.summary} (Code: ${errorData.error.code}) - Detail: ${errorData.error.detail}`;
        } catch {
          errorDetail = `Status: ${response.status} - ${response.statusText}. Could not parse error response.`;
          console.error("Could not parse Tableau API Error response:", await response.text());
        }
        throw new Error(`Tableau API Error: ${errorDetail}`);
      }

      // Successful response
      if (response.status === 204 || response.headers.get("content-length") === "0") {
        return {} as T;
      }
      return (await response.json()) as T;
    };

    return makeRequest(sessionToken, siteLuid);
  } catch (error) {
    // Check if the error is related to authentication
    if (
      error instanceof Error &&
      (error.message.includes("Authentication Failed") ||
        error.message.includes("Signin Error") ||
        error.message.includes("401"))
    ) {
      // Clear tokens on authentication error
      await LocalStorage.removeItem("tableauSessionToken");
      await LocalStorage.removeItem("tableauActualSiteId");
    }
    throw error;
  }
}

// src/utils.ts

// ... (rest of the code unchanged until searchTableauItems)

export async function searchTableauItems(query?: string, limit?: number): Promise<(TableauView | TableauWorkbook)[]> {
  // If limit=1, this is a connection test and we need to make a minimal request
  if (limit === 1) {
    try {
      // Request only 1 workbook with minimal set of fields
      const response = await tableauApiRequest<{ workbooks: { workbook: TableauWorkbook[] } }>(
        "/workbooks?pageSize=1&fields=id,name",
      );

      // If we've reached this point, the API is working, return empty array or minimal data
      if (response.workbooks && response.workbooks.workbook && response.workbooks.workbook.length > 0) {
        const wb = response.workbooks.workbook[0];
        return [
          {
            id: wb.id,
            name: wb.name,
            contentUrl: wb.contentUrl || "",
            createdAt: wb.createdAt || new Date().toISOString(),
            updatedAt: wb.updatedAt || new Date().toISOString(),
            itemType: "Workbook",
            project: { id: "test" },
            owner: { id: "test" },
          },
        ];
      }
      return [];
    } catch (error) {
      console.error("Error in test connection:", error);
      throw error;
    }
  }

  // Main function logic for normal request (unchanged)
  const pageSize = limit || 100;
  let pageNumber = 1;
  let allItems: (TableauView | TableauWorkbook)[] = [];

  // --- Workbooks ---
  pageNumber = 1;
  let moreWorkbooksAvailable = true;
  const workbooks: TableauWorkbook[] = [];

  // Use ALL valid fields returned by the API to not miss anything
  const workbookFieldsList = [
    "contentUrl",
    "description",
    "size",
    "defaultViewId",
    "createdAt",
    "hasExtracts",
    "updatedAt",
    "name",
    "sheetCount",
    "showTabs",
    "shareDescription",
    "id",
    "lastPublishedAt",
    "tags",
    "primaryContentUrl",
    "project.id,project.name",
    "owner.id,owner.name", // Request explicit subfields
  ];

  const workbookFields = workbookFieldsList.join(",");

  // console.log("Attempting to fetch workbooks with fields:", workbookFields);

  while (moreWorkbooksAvailable) {
    try {
      const workbookResponse = await tableauApiRequest<{
        workbooks: { workbook: TableauWorkbook[] };
        pagination: { totalAvailable: string };
      }>(`/workbooks?pageSize=${pageSize}&pageNumber=${pageNumber}&fields=${workbookFields}`);

      if (workbookResponse.workbooks.workbook && workbookResponse.workbooks.workbook.length > 0) {
        // console.log("First workbook data from API (all valid fields):", JSON.stringify(workbookResponse.workbooks.workbook[0], null, 2));
        // Debug project structure specifically
        // console.log("Project data structure:", JSON.stringify(workbookResponse.workbooks.workbook[0].project, null, 2));
      }

      if (workbookResponse.workbooks.workbook && workbookResponse.workbooks.workbook.length > 0) {
        workbookResponse.workbooks.workbook.forEach((wb) => {
          const augmentedWb: TableauWorkbook = {
            ...wb, // Copy ALL fields from wb
            itemType: "Workbook",
            id: wb.id || `unknown-wb-id-${Date.now()}`,
            name: wb.name || "Unknown Workbook",
            contentUrl: wb.contentUrl || "",
            createdAt: wb.createdAt || new Date().toISOString(),
            updatedAt: wb.updatedAt || new Date().toISOString(),
            // project and owner can be undefined if not provided
            project: wb.project || { id: "unknown", name: "Unknown Project" },
            owner: wb.owner || { id: "unknown", name: "Unknown Owner" },
            tags: wb.tags,
          };
          workbooks.push(augmentedWb);
        });
      }
      const totalAvailable = parseInt(workbookResponse.pagination.totalAvailable);
      if (
        workbooks.length >= totalAvailable ||
        (workbookResponse.workbooks.workbook && workbookResponse.workbooks.workbook.length < pageSize) ||
        !workbookResponse.workbooks.workbook
      ) {
        moreWorkbooksAvailable = false;
      } else {
        pageNumber++;
      }
    } catch (error) {
      console.error("Error fetching workbooks:", error);
      moreWorkbooksAvailable = false;
    }
  }
  allItems.push(...workbooks);

  // --- Views ---
  pageNumber = 1;
  let moreViewsAvailable = true;
  const views: TableauView[] = [];
  // "Valid field names [for View] are: [Id, Name, ContentUrl, CreatedAt, UpdatedAt, Owner, Project, Tags, ViewUrlName, Workbook, Usage, SheetType, PreviewImageAvailable]."
  const viewFieldsList = [
    "id",
    "name",
    "contentUrl",
    "createdAt",
    "updatedAt",
    "owner.id,owner.name",
    "project.id,project.name",
    "tags",
    "viewUrlName",
    "workbook.id,workbook.name,workbook.contentUrl",
    "sheetType",
  ];
  const viewFields = viewFieldsList.join(",");

  while (moreViewsAvailable) {
    try {
      const viewResponse = await tableauApiRequest<{
        views: { view: TableauView[] };
        pagination: { totalAvailable: string };
      }>(`/views?pageSize=${pageSize}&pageNumber=${pageNumber}&fields=${viewFields}`);

      // DEBUG LOG FOR VIEWS (if needed)
      if (viewResponse.views.view && viewResponse.views.view.length > 0) {
        // console.log("First view data from API (all valid fields):", JSON.stringify(viewResponse.views.view[0], null, 2));
        // Debug workbook and usage structure specifically
        // console.log("Workbook data structure:", JSON.stringify(viewResponse.views.view[0].workbook, null, 2));
      }

      if (viewResponse.views.view && viewResponse.views.view.length > 0) {
        viewResponse.views.view.forEach((v) => {
          const augmentedView: TableauView = {
            ...v,
            itemType: "View",
            id: v.id || `unknown-view-id-${Date.now()}`,
            name: v.name || "Unknown View",
            contentUrl: v.contentUrl || "",
            createdAt: v.createdAt || new Date().toISOString(),
            updatedAt: v.updatedAt || new Date().toISOString(),
            project: v.project || { id: "unknown", name: "Unknown Project" },
            owner: v.owner || { id: "unknown", name: "Unknown Owner" },
            workbook: v.workbook || { id: "unknown", name: "Unknown Workbook", contentUrl: "" },
            tags: v.tags,
          };
          views.push(augmentedView);
        });
      }
      const totalAvailable = parseInt(viewResponse.pagination.totalAvailable);
      if (
        views.length >= totalAvailable ||
        (viewResponse.views.view && viewResponse.views.view.length < pageSize) ||
        !viewResponse.views.view
      ) {
        moreViewsAvailable = false;
      } else {
        pageNumber++;
      }
    } catch (error) {
      console.error("Error fetching views:", error);
      moreViewsAvailable = false;
    }
  }
  allItems.push(...views);

  // ... (Filtering and Sorting unchanged)
  if (query) {
    const lowerQuery = query.toLowerCase();
    allItems = allItems.filter(
      (item) =>
        (item.name && item.name.toLowerCase().includes(lowerQuery)) ||
        (item.project?.name && item.project.name.toLowerCase().includes(lowerQuery)) || // project and owner can be undefined or without .name
        (item.owner?.name && item.owner.name.toLowerCase().includes(lowerQuery)) ||
        (item.tags?.tag && item.tags.tag.some((t) => t.label.toLowerCase().includes(lowerQuery))),
    );
  }

  allItems.sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return allItems.slice(0, limit || 100);
}

// getItemUrl taking into account that the short ID for workbooks is most likely unavailable.
// Therefore, contentUrl is used for workbooks.
export async function getItemUrl(item: TableauView | TableauWorkbook): Promise<string> {
  const { tableauServerUrl, tableauSiteId: siteContentUrlFromPrefs } = await getEffectivePreferences();
  const sitePath = siteContentUrlFromPrefs ? `/site/${siteContentUrlFromPrefs}` : "";

  if (item.itemType === "Workbook") {
    const workbook = item as TableauWorkbook;

    // Check if we have the direct webpageUrl from the API
    if ("webpageUrl" in workbook && typeof workbook.webpageUrl === "string") {
      return workbook.webpageUrl;
    }

    if (!workbook.contentUrl && !workbook.id) {
      console.error("Both workbook contentUrl and id are missing, cannot generate URL:", workbook);
      throw new Error("Workbook identification data missing for URL generation.");
    }

    // If no direct URL is available, construct it from the ID
    return `${tableauServerUrl}/#${sitePath}/workbooks/${encodeURIComponent(workbook.id)}/views`;
  } else if (item.itemType === "View") {
    const view = item as TableauView;

    // Check if we have the direct webpageUrl from the API
    if ("webpageUrl" in view && typeof view.webpageUrl === "string") {
      return view.webpageUrl;
    }

    // For views we need to get the workbook's contentUrl and the view's viewUrlName
    let workbookContentUrl = view.workbook?.contentUrl;
    const viewName = view.viewUrlName;

    // If the view doesn't have workbook.contentUrl but has its own contentUrl
    // Example: contentUrl = "MainVIPDashboard/sheets/MainVIPDashboard"
    if (!workbookContentUrl && view.contentUrl) {
      const parts = view.contentUrl.split("/");
      if (parts.length > 0) {
        workbookContentUrl = parts[0]; // First part is usually the workbook's contentUrl
      }
    }

    if (!workbookContentUrl || !viewName) {
      console.error("View or its Workbook contentUrl/viewUrlName is missing, cannot generate URL:", view);
      throw new Error("View or its Workbook contentUrl/viewUrlName is missing for URL generation.");
    }

    // Generate URL for view using workbook's contentUrl (not ID) and viewUrlName
    return `${tableauServerUrl}/#${sitePath}/views/${encodeURIComponent(workbookContentUrl)}/${encodeURIComponent(viewName)}`;
  }

  console.error("Unknown item type, cannot generate URL:", item);
  throw new Error("Unknown item type for URL generation.");
}
