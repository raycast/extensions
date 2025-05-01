import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { CollectionsResponse, TagsResponse } from "../types"; // Import response types

// Define interfaces based on Raindrop API documentation
// (These might need refinement based on actual API usage in the extension)
interface Preferences {
  token: string;
  // other preferences...
}

export interface Collection {
  _id: number;
  title: string;
  // other collection fields...
}

// Interface for Tag items from the API (matching TagsResponse)
export interface TagItem {
  _id: string;
  count: number;
}

export interface BookmarkData {
  link: string;
  title?: string;
  excerpt?: string;
  tags?: string[];
  collectionId?: number;
  // other fields as needed...
}

const API_ENDPOINT = "https://api.raindrop.io/rest/v1";

// Helper to get authenticated headers
function getAuthHeaders(): { Authorization: string } {
  const { token }: Preferences = getPreferenceValues();
  if (!token) {
    throw new Error("Raindrop API token not configured.");
  }
  return { Authorization: `Bearer ${token}` };
}

// Function to fetch collections
export async function fetchCollections(): Promise<Collection[]> {
  console.log("Fetching collections via API...");
  try {
    const response = await fetch(`${API_ENDPOINT}/collections`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch collections: ${response.status} ${errorText}`);
    }
    const data = (await response.json()) as CollectionsResponse;
    // Ensure we return only the Collection type, matching the return signature
    return data.items.map((item) => ({ _id: item._id, title: item.title }));
  } catch (error) {
    console.error("Error in fetchCollections:", error);
    throw error; // Re-throw error to be caught by caller
  }
}

// Function to fetch tags
export async function fetchTags(): Promise<string[]> {
  console.log("Fetching tags via API...");
  try {
    const response = await fetch(`${API_ENDPOINT}/tags`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch tags: ${response.status} ${errorText}`);
    }
    const data = (await response.json()) as TagsResponse;
    // Return just the tag names (strings)
    return data.items.map((tag: TagItem) => tag._id);
  } catch (error) {
    console.error("Error in fetchTags:", error);
    throw error; // Re-throw error to be caught by caller
  }
}

// Function to create a bookmark
export async function createBookmark(data: BookmarkData): Promise<unknown> {
  // TODO: Implement actual API call to create a bookmark
  console.log("Creating bookmark with data:", data);
  // Placeholder remains for now
  await new Promise((resolve) => setTimeout(resolve, 100));
  return { result: true, item: { ...data, _id: Date.now() } };
}
