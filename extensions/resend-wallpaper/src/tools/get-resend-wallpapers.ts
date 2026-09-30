import axios from "axios";
import type { ResendWallpaper } from "../types/types";
import { RESEND_WALLPAPER_LIST_URL } from "../utils/constants";

/** List the current Resend wallpapers and their image URLs. */
export default async function getResendWallpapers() {
  const response = await axios.get<ResendWallpaper[]>(RESEND_WALLPAPER_LIST_URL);
  return response.data;
}
