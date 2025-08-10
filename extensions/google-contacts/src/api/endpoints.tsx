import fetch from "node-fetch";
import { Contact, ContactForm, ContactGroup } from "../types";
import { client, forceReauthenticate } from "./oauth";
import { getResourceId } from "../utils";
import { showToast, Toast } from "@raycast/api";
// API Constants
const PEOPLE_API_BASE = "https://people.googleapis.com/v1";
const PERSON_FIELDS =
  "names,emailAddresses,phoneNumbers,addresses,organizations,biographies,photos,urls,birthdays,userDefined,metadata";
const CONTACT_GROUP_FIELDS = "metadata,groupType,name,memberCount";

// Helper function to handle API calls with authentication error handling
async function executeApiCallWithAuth<T>(
  apiCall: () => Promise<T>,
  errorMessage: string = "API error",
  retryAfterReauth: boolean = false
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    console.error(`${errorMessage}:`, error);

    // Check if this is an authentication-related error
    const errorStr = String(error).toLowerCase();
    const isAuthError =
      errorStr.includes("unauthorized") ||
      errorStr.includes("unauthenticated") ||
      errorStr.includes("bad request") ||
      errorStr.includes("invalid") ||
      errorStr.includes("forbidden") ||
      errorStr.includes("401") ||
      errorStr.includes("403");

    // Only attempt reauthentication if this isn't already a retry
    if (isAuthError && !retryAfterReauth) {
      showToast({
        style: Toast.Style.Animated,
        title: "Authentication error detected",
        message: "Attempting to re-login...",
      });

      try {
        // Attempt to force a new authentication
        await forceReauthenticate();

        showToast({
          style: Toast.Style.Success,
          title: "Re-authenticated successfully",
          message: "Retrying operation...",
        });

        // Try the API call again after successful reauthentication
        return await executeApiCallWithAuth(apiCall, errorMessage, true);
      } catch (reauthError) {
        console.error("Reauthentication failed:", reauthError);
        showToast({
          style: Toast.Style.Failure,
          title: "Login failed",
          message: "Please try again later",
        });
      }
    }

    // Re-throw the original error
    throw error;
  }
}

// API
// API

export async function fetchContactGroups(): Promise<ContactGroup[]> {
  return executeApiCallWithAuth(async () => {
    const response = await fetch(`${PEOPLE_API_BASE}/contactGroups?groupFields=${CONTACT_GROUP_FIELDS}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fetch contact groups error:", errorText);
      throw new Error(response.statusText);
    }

    const json = (await response.json()) as {
      contactGroups: ContactGroup[];
      nextPageToken?: string;
      totalItems?: number;
    };

    return json.contactGroups || [];
  }, "Error fetching contact groups");
}

export async function fetchContacts(maxResults = 1000): Promise<Contact[]> {
  let allContacts: Contact[] = [];
  let nextPageToken: string | undefined;
  const pageSize = 100; // API max is 100 per page
  const maxPageRetries = 3; // Maximum number of retries per page

  try {
    // Initial authorization - only done once before pagination starts
    const authToken = (await client.getTokens())?.accessToken;
    if (!authToken) {
      console.error("No auth token available");
      // Try to reauthenticate automatically
      try {
        showToast({
          style: Toast.Style.Animated,
          title: "Authentication required",
          message: "Attempting to login...",
        });

        await forceReauthenticate();

        // Try to get the token again after reauthentication
        const newAuthToken = (await client.getTokens())?.accessToken;
        if (!newAuthToken) {
          showToast({
            style: Toast.Style.Failure,
            title: "Login failed",
            message: "Unable to authenticate",
          });
          return [];
        }

        showToast({
          style: Toast.Style.Success,
          title: "Login successful",
          message: "Fetching your contacts...",
        });
      } catch (authError) {
        console.error("Authentication error:", authError);
        showToast({
          style: Toast.Style.Failure,
          title: "Login failed",
          message: "Please try again later",
        });
        return [];
      }
    }

    let pageCount = 0;
    let continuePageFetching = true;

    // Continue fetching pages until we have all contacts, reach the limit,
    // or determine we should stop due to errors
    while (continuePageFetching && allContacts.length < maxResults) {
      pageCount++;
      let pageRetries = 0;
      let pageSuccess = false;
      let needsReauth = false;

      // Retry logic for each page
      while (pageRetries < maxPageRetries && !pageSuccess) {
        try {
          // If we identified an auth issue in a previous attempt, reauthenticate before trying again
          if (needsReauth) {
            showToast({
              style: Toast.Style.Animated,
              title: "Authentication error detected",
              message: "Attempting to re-login...",
            });

            await forceReauthenticate();

            showToast({
              style: Toast.Style.Success,
              title: "Re-authenticated successfully",
              message: "Continuing to fetch contacts...",
            });

            needsReauth = false;
          }

          // Get fresh token after possible reauthentication
          const currentToken = (await client.getTokens())?.accessToken;
          if (!currentToken) {
            throw new Error("No valid authentication token available");
          }

          const params = new URLSearchParams();
          params.append("personFields", PERSON_FIELDS);
          params.append("pageSize", pageSize.toString());

          // Add page token if we have one (for pages after the first)
          if (nextPageToken) {
            params.append("pageToken", nextPageToken);
          }

          const response = await fetch(`${PEOPLE_API_BASE}/people/me/connections?${params.toString()}`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentToken}`,
            },
            // We can't set a timeout directly with fetch, but we'll handle errors gracefully
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Fetch contacts error (page ${pageCount}, attempt ${pageRetries + 1}):`, errorText);

            // For certain errors, try to reauthenticate on the next attempt
            if (
              response.status === 401 ||
              response.status === 403 ||
              errorText.toLowerCase().includes("bad request") ||
              errorText.toLowerCase().includes("invalid")
            ) {
              needsReauth = true;
              throw new Error(`Authentication error: ${response.statusText}`);
            }

            pageRetries++;
            if (pageRetries >= maxPageRetries) {
              console.error(`Failed to fetch page ${pageCount} after ${maxPageRetries} attempts, stopping pagination`);
              continuePageFetching = false;
              break;
            }

            // Wait a bit before retrying
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }

          const json = (await response.json()) as {
            connections: Contact[];
            nextPageToken?: string;
            totalItems?: number;
          };

          // Add this page of contacts to our collection
          if (json.connections && json.connections.length > 0) {
            allContacts = [...allContacts, ...json.connections];
            console.log(`Added ${json.connections.length} contacts from page ${pageCount}`);
          } else {
            console.log(`Page ${pageCount} returned no contacts`);
          }

          // Update page token for next iteration
          nextPageToken = json.nextPageToken;

          // If no next page token, we've reached the end
          if (!nextPageToken) {
            console.log("No more pages available, pagination complete");
            continuePageFetching = false;
          }

          pageSuccess = true;
        } catch (pageError) {
          console.error(`Error during page ${pageCount} fetch (attempt ${pageRetries + 1}):`, pageError);

          // If we need to reauthenticate, don't increment retry count
          // This gives us a full set of retries after reauthentication
          if (!needsReauth) {
            pageRetries++;
          }

          if (pageRetries >= maxPageRetries && !needsReauth) {
            console.error(`Failed to fetch page ${pageCount} after ${maxPageRetries} attempts, stopping pagination`);
            continuePageFetching = false;
            break;
          }

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // If we've reached the maximum requested results, stop
      if (allContacts.length >= maxResults) {
        console.log(`Reached maximum requested results (${maxResults}), stopping pagination`);
        break;
      }
    }
  } catch (error) {
    console.error("Critical error in fetchContacts:", error);
    // Don't throw, return whatever contacts we've fetched so far
  }

  console.log(`Fetched ${allContacts.length} total contacts across ${nextPageToken ? "multiple" : "1"} pages`);
  return allContacts;
}

export async function fetchContactsInGroup(groupResourceName: string, maxResults = 100): Promise<Contact[]> {
  return executeApiCallWithAuth(async () => {
    const groupId = getResourceId(groupResourceName);
    const params = new URLSearchParams();
    params.append("personFields", PERSON_FIELDS);
    params.append("pageSize", maxResults.toString());

    const response = await fetch(`${PEOPLE_API_BASE}/contactGroups/${groupId}/members?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fetch contacts in group error:", errorText);
      throw new Error(response.statusText);
    }

    const json = (await response.json()) as {
      memberResourceNames: string[];
      nextPageToken?: string;
    };

    if (!json.memberResourceNames || json.memberResourceNames.length === 0) {
      return [];
    }

    // Now fetch the actual contact details for each member resource name
    const contacts: Contact[] = [];
    for (const resourceName of json.memberResourceNames) {
      try {
        const contact = await fetchContact(resourceName);
        contacts.push(contact);
      } catch (error) {
        console.error(`Error fetching contact ${resourceName}:`, error);
      }
    }

    return contacts;
  }, `Error fetching contacts in group ${groupResourceName}`);
}

export async function fetchContact(resourceName: string): Promise<Contact> {
  return executeApiCallWithAuth(async () => {
    const personId = getResourceId(resourceName);
    const params = new URLSearchParams();
    params.append("personFields", PERSON_FIELDS);

    const response = await fetch(`${PEOPLE_API_BASE}/people/${personId}?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fetch contact error:", errorText);
      throw new Error(response.statusText);
    }

    return (await response.json()) as Contact;
  }, `Error fetching contact ${resourceName}`);
}

export async function createContact(contactData: ContactForm): Promise<Contact> {
  return executeApiCallWithAuth(async () => {
    const response = await fetch(`${PEOPLE_API_BASE}/people:createContact`, {
      method: "POST",
      body: JSON.stringify(contactData),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Create contact error:", errorText);
      throw new Error(response.statusText);
    }

    return (await response.json()) as Contact;
  }, "Error creating new contact");
}

export async function updateContact(
  resourceName: string,
  contactData: Partial<ContactForm>,
  updatePersonFields: string
): Promise<Contact> {
  return executeApiCallWithAuth(async () => {
    const personId = getResourceId(resourceName);

    // First, fetch the contact to get its etag
    const currentContact = await fetchContact(resourceName);

    // Add the etag to the update data - required by Google API to prevent concurrent update conflicts
    const updateDataWithEtag = {
      ...contactData,
      etag: currentContact.etag,
    };

    const params = new URLSearchParams();
    params.append("updatePersonFields", updatePersonFields);

    const response = await fetch(`${PEOPLE_API_BASE}/people/${personId}:updateContact?${params.toString()}`, {
      method: "PATCH",
      body: JSON.stringify(updateDataWithEtag),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Update contact error:", errorText);
      throw new Error(response.statusText);
    }

    return (await response.json()) as Contact;
  }, `Error updating contact ${resourceName}`);
}

export async function deleteContact(resourceName: string): Promise<void> {
  return executeApiCallWithAuth(async () => {
    const personId = getResourceId(resourceName);

    const response = await fetch(`${PEOPLE_API_BASE}/people/${personId}:deleteContact`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Delete contact error:", errorText);
      throw new Error(response.statusText);
    }
  }, `Error deleting contact ${resourceName}`);
}

// This function is no longer needed as we use local favorites now
// Keeping a stub to avoid breaking existing code
export async function toggleFavorite(contact: Contact): Promise<Contact> {
  console.log("Using local favorites instead of Google API favorites");
  // Simply return the contact without modifying it
  return contact;
}
