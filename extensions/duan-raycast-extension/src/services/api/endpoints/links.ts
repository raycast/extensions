import { fetchWithAuth } from "../client";
import type { Link } from "../../../types";
import type { CreateLinkRequest, CreateLinkResponse, UpdateLinkRequest } from "../types";

export const getLinks = async (): Promise<Link[]> => {
  return fetchWithAuth<Link[]>("/api/links", { method: "GET" });
};

export const createLink = async (data: CreateLinkRequest): Promise<CreateLinkResponse> => {
  return fetchWithAuth<CreateLinkResponse>("/api/links", {
    method: "POST",
    body: data,
  });
};

export const getLink = async (shortcode: string): Promise<Link> => {
  return fetchWithAuth<Link>(`/api/links/${shortcode}`, { method: "GET" });
};

export const updateLink = async (shortcode: string, data: UpdateLinkRequest): Promise<{ message: string }> => {
  return fetchWithAuth<{ message: string }>(`/api/links/${shortcode}`, {
    method: "PATCH",
    body: data,
  });
};

export const deleteLink = async (shortcode: string): Promise<{ message: string }> => {
  return fetchWithAuth<{ message: string }>(`/api/links/${shortcode}`, {
    method: "DELETE",
  });
};
