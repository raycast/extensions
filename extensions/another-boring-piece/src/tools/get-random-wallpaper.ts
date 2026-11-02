import { API_RANDOM_URL, type Wallpaper } from "../utils";

export default async function tool(): Promise<Wallpaper> {
  const response = await fetch(API_RANDOM_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch wallpaper: ${response.status}`);
  }
  return response.json();
}
