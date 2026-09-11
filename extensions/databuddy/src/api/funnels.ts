import { post } from "./client";
import type { Funnel, FunnelAnalytics } from "../types";

export async function fetchFunnels(websiteId: string): Promise<Funnel[]> {
  if (!websiteId) return [];
  return post<Funnel[]>("/funnels/list", { websiteId });
}

export async function fetchFunnel(id: string): Promise<Funnel> {
  if (!id) throw new Error("Funnel ID is required");
  return post<Funnel>("/funnels/getById", { id });
}

export async function deleteFunnel(id: string): Promise<void> {
  if (!id) throw new Error("Funnel ID is required");
  await post<{ success: true }>("/funnels/delete", { id });
}

export async function fetchFunnelAnalytics(funnelId: string, websiteId: string): Promise<FunnelAnalytics> {
  if (!funnelId || !websiteId) throw new Error("Funnel ID and Website ID are required");
  return post<FunnelAnalytics>("/funnels/getAnalytics", { funnelId, websiteId });
}
