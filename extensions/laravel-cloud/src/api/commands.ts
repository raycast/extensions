import { apiGet, apiPost } from "./client";
import { PaginatedResponse, SingleResponse } from "../types/api";
import { Command } from "../types/command";

export async function listCommands(
  environmentId: string,
  filters?: { status?: string; command?: string },
  include?: string,
): Promise<PaginatedResponse<Command>> {
  const params: Record<string, string> = { per_page: "100" };
  if (include) params.include = include;
  if (filters?.status) params["filter[status]"] = filters.status;
  if (filters?.command) params["filter[command]"] = filters.command;

  return apiGet<PaginatedResponse<Command>>(`/environments/${environmentId}/commands`, params);
}

export async function getCommand(id: string, include?: string): Promise<SingleResponse<Command>> {
  const params: Record<string, string> = {};
  if (include) params.include = include;

  return apiGet<SingleResponse<Command>>(`/commands/${id}`, params);
}

export async function runCommand(environmentId: string, command: string): Promise<SingleResponse<Command>> {
  return apiPost<SingleResponse<Command>>(`/environments/${environmentId}/commands`, { command });
}
