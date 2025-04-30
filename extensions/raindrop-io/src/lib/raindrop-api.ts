import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

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

export interface Tag {
  _id: string; // Tags seem to be just strings in many responses
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
  // TODO: Implement actual API call to fetch collections
  // Example structure:
  // const response = await fetch(`${API_ENDPOINT}/collections`, { headers: getAuthHeaders() });
  // if (!response.ok) throw new Error('Failed to fetch collections');
  // const data = await response.json();
  // return data.items;
  console.log("Fetching collections...");
  // Placeholder data
  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay
  return [
    { _id: 1, title: "Reading List" },
    { _id: -1, title: "Unsorted" },
    { _id: 123, title: "Tech" },
  ];
}

// Function to fetch tags
export async function fetchTags(): Promise<string[]> {
  // TODO: Implement actual API call to fetch tags
  // Example structure:
  // const response = await fetch(`${API_ENDPOINT}/tags`, { headers: getAuthHeaders() });
  // if (!response.ok) throw new Error('Failed to fetch tags');
  // const data = await response.json();
  // return data.items.map(tag => tag._id); // Assuming tags are returned this way
  console.log("Fetching tags...");
  // Placeholder data
  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay
  return ["article", "tech", "javascript", "raycast", "productivity"];
}

// Function to create a bookmark
export async function createBookmark(data: BookmarkData): Promise<any> {
  // TODO: Implement actual API call to create a bookmark
  // This might reuse existing logic from the 'add' command file.
  // Example structure:
  // const response = await fetch(`${API_ENDPOINT}/raindrop`, {
  //   method: 'POST',
  //   headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data),
  // });
  // if (!response.ok) {
  //   const errorBody = await response.text();
  //   throw new Error(`Failed to create bookmark: ${response.status} ${errorBody}`);
  // }
  // return await response.json();
  console.log("Creating bookmark with data:", data);
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
  return { result: true, item: { ...data, _id: Date.now() } }; // Simulate success response
} 