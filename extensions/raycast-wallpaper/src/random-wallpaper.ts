import { raycastWallpaper } from "./utils/raycast-wallpaper-utils";
import { setWallpaper } from "./utils/common-utils";

export default async () => {
  const randomImage = raycastWallpaper[Math.floor(Math.random() * raycastWallpaper.length)];
  await setWallpaper(randomImage);
};
