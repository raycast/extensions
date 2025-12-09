/* eslint-disable @typescript-eslint/no-explicit-any */
import { jiraFetch } from "./jira";

export async function getBoards(): Promise<any[]> {
  // Use Agile API v1.0
  const result = await jiraFetch("/board", {}, "agile/1.0");
  return result.values || [];
}

export async function getActiveSprints(boardId: number): Promise<any[]> {
  // Use Agile API v1.0
  const result = await jiraFetch(`/board/${boardId}/sprint?state=active`, {}, "agile/1.0");
  return result.values || [];
}

export async function getSprintIssues(sprintId: number): Promise<any[]> {
  // Use Agile API v1.0
  const result = await jiraFetch(`/sprint/${sprintId}/issue`, {}, "agile/1.0");
  return result.issues || [];
}
