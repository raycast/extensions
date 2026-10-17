import { API_TRIPLE_URL, type Wallpaper } from "../utils";

export default async function tool(): Promise<{
  today: Wallpaper;
  random: Wallpaper[];
}> {
  const response = await fetch(`${API_TRIPLE_URL}?cacheBust=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch wallpapers: ${response.status}`);
  }
  return response.json();
}
