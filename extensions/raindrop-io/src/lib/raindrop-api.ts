import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { Collection, CollectionsResponse, TagsResponse, CollectionCreationResponse } from "../types"; // Import response types

// Define interfaces based on Raindrop API documentation
// (These might need refinement based on actual API usage in the extension)
interface Preferences {
  token: string;
  // other preferences...
}

// Interface for Tag items from the API (matching TagsResponse)
export interface TagItem {
  _id: string;
  count: number;
}

// Define BookmarkData based on fields needed for creation
export interface BookmarkCreationData {
  link: string;
  title?: string;
  tags?: string[];
  collectionId?: string; // ID used in creation might be string
  pleaseParse?: object; // Include this as it's used in the existing logic
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
    // Now returns the full Collection type from types.ts
    return data.items;
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

// Function to create a new collection (Helper for createBookmark)
// Takes title, returns the new collection object
export async function createCollectionAPI(title: string): Promise<Collection> {
  console.log(`Creating collection via API: ${title}`);
  try {
    const response = await fetch(`${API_ENDPOINT}/collection`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ title, parent: { $id: {} } }), // Assuming root level creation
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create collection: ${response.status} ${errorText}`);
    }
    const data = (await response.json()) as CollectionCreationResponse;
    return data.item;
  } catch (error) {
    console.error("Error in createCollectionAPI:", error);
    throw error;
  }
}

// Function to create one or more bookmarks
// Accepts an array of items matching the API structure
export async function createBookmarksAPI(items: BookmarkCreationData[]): Promise<unknown> {
  console.log("Creating bookmarks via API with items:", items);
  try {
    const response = await fetch(`${API_ENDPOINT}/raindrops`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ items }), // Send the items array directly
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create bookmark(s): ${response.status} ${errorText}`);
    }
    // Return the parsed response (or just success status)
    const responseData = await response.json();
    console.log("Bookmark creation response:", responseData);
    return responseData; // Return the actual response
  } catch (error) {
    console.error("Error in createBookmarksAPI:", error);
    throw error;
  }
}
