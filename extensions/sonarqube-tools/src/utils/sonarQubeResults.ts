/**
 * Utilities for fetching and processing SonarQube analysis results
 */

import fetch from "node-fetch";
import { showToast, Toast } from "@raycast/api";

export interface SonarQubeMetric {
  metric: string;
  value: string;
}

export interface SonarQubeIssue {
  key: string;
  rule: string;
  severity: string;
  component: string;
  project: string;
  line?: number;
  message: string;
  type: string;
  author?: string;
  creationDate?: string;
}

export interface SonarQubeResults {
  issues: SonarQubeIssue[];
  metrics: SonarQubeMetric[];
  projectKey: string;
}

/**
 * Fetches SonarQube analysis results for a given project from a SonarQube server
 * @param projectKey The project key in SonarQube
 * @param serverUrl The SonarQube server URL, defaults to localhost:9000
 * @returns Object containing issues and metrics data
 */
export async function fetchSonarQubeResults(
  projectKey: string,
  serverUrl: string = "http://localhost:9000",
): Promise<SonarQubeResults> {
  try {
    // Extract project key from path if needed (simple heuristic)
    // This may need to be adjusted based on how project keys are actually structured in your environment
    const simplifiedProjectKey = projectKey.split("/").pop() || projectKey;

    // Fetch issues
    const issuesResponse = await fetch(
      `${serverUrl}/api/issues/search?projectKeys=${simplifiedProjectKey}&resolved=false`,
    );

    if (!issuesResponse.ok) {
      throw new Error(`Error fetching issues: ${issuesResponse.statusText}`);
    }

    const issuesData = await issuesResponse.json();

    // Fetch metrics
    const keyMetrics = [
      "bugs",
      "vulnerabilities",
      "code_smells",
      "coverage",
      "duplicated_lines_density",
      "security_rating",
      "reliability_rating",
      "sqale_rating",
    ].join(",");

    const metricsResponse = await fetch(
      `${serverUrl}/api/measures/component?component=${simplifiedProjectKey}&metricKeys=${keyMetrics}`,
    );

    if (!metricsResponse.ok) {
      throw new Error(`Error fetching metrics: ${metricsResponse.statusText}`);
    }

    const metricsData = await metricsResponse.json();

    return {
      issues: issuesData.issues || [],
      metrics: metricsData.component?.measures || [],
      projectKey: simplifiedProjectKey,
    };
  } catch (error) {
    console.error("Error fetching SonarQube results:", error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch SonarQube results",
      message: error instanceof Error ? error.message : String(error),
    });

    // Return empty results on error
    return {
      issues: [],
      metrics: [],
      projectKey,
    };
  }
}
