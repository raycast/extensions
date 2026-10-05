import { post } from "./client";
import type { Flag, FlagCreateInput, FlagUpdateInput } from "../types";

export async function fetchFlags(websiteId: string): Promise<Flag[]> {
  if (!websiteId) return [];
  return post<Flag[]>("/flags/list", { websiteId });
}

export async function fetchFlag(id: string): Promise<Flag> {
  if (!id) throw new Error("Flag ID is required");
  return post<Flag>("/flags/getById", { id });
}

export async function createFlag(websiteId: string, data: FlagCreateInput): Promise<Flag> {
  return post<Flag>("/flags/create", { websiteId, ...data } as unknown as Record<string, unknown>);
}

export async function updateFlag(id: string, data: FlagUpdateInput): Promise<Flag> {
  if (!id) throw new Error("Flag ID is required");
  return post<Flag>("/flags/update", { id, ...data });
}

export async function deleteFlag(id: string): Promise<void> {
  if (!id) throw new Error("Flag ID is required");
  await post<{ success: true }>("/flags/delete", { id });
}

export async function toggleFlagStatus(id: string, status: "active" | "inactive"): Promise<Flag> {
  if (!id) throw new Error("Flag ID is required");
  return post<Flag>("/flags/update", { id, status });
}
