import { getBackendUrl, getStoredSession } from "../config";
import { autoRelogin } from "./auth";
import { Subject, AssessmentData } from "../types";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const sessionId = await getStoredSession();
  const headers: Record<string, string> = {};

  if (sessionId) {
    // Backend supports X-Session-Cookie header as fallback (from upcoming-tests-backend.md)
    headers["X-Session-Cookie"] = sessionId;
    // Also try sending as Cookie header in case backend checks that first
    headers["Cookie"] = `JSESSIONID=${sessionId}`;
    console.log("[TESTS] Session ID found, added to headers (first 8 chars):", sessionId.substring(0, 8) + "...");
  } else {
    console.warn("[TESTS] No session ID found in storage");
  }

  return headers;
}

export async function getSubjects(): Promise<Subject[]> {
  const backendUrl = getBackendUrl();
  const headers = await getAuthHeaders();

  console.log("[TESTS] Fetching subjects from:", `${backendUrl}/api/subjects`);
  console.log("[TESTS] Request headers:", Object.keys(headers));

  const response = await fetch(`${backendUrl}/api/subjects`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  console.log("[TESTS] Subjects response status:", response.status, response.statusText);
  console.log("[TESTS] Subjects response headers:", Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    if (response.status === 401) {
      console.error("[TESTS] Unauthorized - session expired or invalid");
      console.log("[TESTS] Attempting automatic re-login...");

      // Try to automatically re-login
      const reloginSuccess = await autoRelogin();
      if (reloginSuccess) {
        console.log("[TESTS] Auto-relogin successful, retrying request...");
        // Retry the request with new session
        const retryHeaders = await getAuthHeaders();
        const retryResponse = await fetch(`${backendUrl}/api/subjects`, {
          method: "GET",
          headers: retryHeaders,
          credentials: "include",
        });

        if (retryResponse.ok) {
          const retryData = (await retryResponse.json()) as Subject[];
          console.log("[TESTS] Successfully fetched", retryData.length, "subjects after auto-relogin");
          return retryData;
        }
      }

      throw new Error("Unauthorized - Please login again");
    }
    console.error("[TESTS] Failed to fetch subjects:", response.status, response.statusText);
    throw new Error(`Failed to fetch subjects: ${response.statusText}`);
  }

  const data = (await response.json()) as Subject[];
  console.log("[TESTS] Successfully fetched", data.length, "subjects");
  return data;
}

export async function getAssessment(id: string): Promise<AssessmentData> {
  const backendUrl = getBackendUrl();
  const headers = await getAuthHeaders();

  // Extract numeric ID from subject ID (format: "123-something")
  const numericId = id.split("-")[0];
  console.log("[TESTS] Fetching assessment for ID:", id, "(numeric:", numericId + ")");

  const response = await fetch(`${backendUrl}/api/assessment/${numericId}`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  console.log("[TESTS] Assessment response status:", response.status, response.statusText);

  if (!response.ok) {
    if (response.status === 401) {
      console.error("[TESTS] Unauthorized when fetching assessment");
      console.log("[TESTS] Attempting automatic re-login...");

      // Try to automatically re-login
      const reloginSuccess = await autoRelogin();
      if (reloginSuccess) {
        console.log("[TESTS] Auto-relogin successful, retrying assessment request...");
        // Retry the request with new session
        const retryHeaders = await getAuthHeaders();
        const retryResponse = await fetch(`${backendUrl}/api/assessment/${numericId}`, {
          method: "GET",
          headers: retryHeaders,
          credentials: "include",
        });

        if (retryResponse.ok) {
          const retryData = (await retryResponse.json()) as AssessmentData;
          console.log("[TESTS] Successfully fetched assessment after auto-relogin");
          return retryData;
        }
      }

      throw new Error("Unauthorized - Please login again");
    }
    console.error("[TESTS] Failed to fetch assessment:", response.status, response.statusText);
    throw new Error(`Failed to fetch assessment: ${response.statusText}`);
  }

  const data = (await response.json()) as AssessmentData;
  console.log("[TESTS] Successfully fetched assessment data");
  return data;
}

export async function getAssignment(id: string): Promise<Subject> {
  const backendUrl = getBackendUrl();
  const headers = await getAuthHeaders();

  // Extract numeric ID from subject ID (format: "123-something")
  const numericId = id.split("-")[0];
  console.log("[TESTS] Fetching assignment details for ID:", id, "(numeric:", numericId + ")");

  const response = await fetch(`${backendUrl}/api/assignments/${numericId}`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  console.log("[TESTS] Assignment response status:", response.status, response.statusText);

  if (!response.ok) {
    if (response.status === 401) {
      console.error("[TESTS] Unauthorized when fetching assignment");
      console.log("[TESTS] Attempting automatic re-login...");

      // Try to automatically re-login
      const reloginSuccess = await autoRelogin();
      if (reloginSuccess) {
        console.log("[TESTS] Auto-relogin successful, retrying assignment request...");
        // Retry the request with new session
        const retryHeaders = await getAuthHeaders();
        const retryResponse = await fetch(`${backendUrl}/api/assignments/${numericId}`, {
          method: "GET",
          headers: retryHeaders,
          credentials: "include",
        });

        if (retryResponse.ok) {
          const retryData = (await retryResponse.json()) as Subject;
          console.log("[TESTS] Successfully fetched assignment after auto-relogin");
          return retryData;
        }
      }

      throw new Error("Unauthorized - Please login again");
    }
    console.error("[TESTS] Failed to fetch assignment:", response.status, response.statusText);
    throw new Error(`Failed to fetch assignment: ${response.statusText}`);
  }

  const data = (await response.json()) as Subject;
  console.log("[TESTS] Successfully fetched assignment details");
  return data;
}
