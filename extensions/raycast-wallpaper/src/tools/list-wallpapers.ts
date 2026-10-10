import axios from "axios";
import { RaycastWallpaper } from "../types/types";
import { RAYCAST_WALLPAPER_LIST_URL } from "../utils/constants";

/** List official Raycast wallpapers. Use the returned exact titles when setting a wallpaper. */
export default async function listWallpapers(): Promise<RaycastWallpaper[]> {
  const { data } = await axios.get<RaycastWallpaper[]>(RAYCAST_WALLPAPER_LIST_URL);
  return data;
}
