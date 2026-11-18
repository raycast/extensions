import { showToast, Toast, updateCommandMetadata, environment, LaunchType } from "@raycast/api";
import { getAutoSettings } from "./auto-settings";
import { fetchFeatured, getImageUrl } from "./api";
import { imageToAscii, generateWallpaper, computeFillRows, getScreenResolution } from "./ascii";
import { setWallpaper } from "./wallpaper";

export default async function Command() {
  const settings = await getAutoSettings();
  const isBackground = environment.launchType === LaunchType.Background;

  if (!isBackground) {
    await showToast({
      style: Toast.Style.Animated,
      title: "Picking a random artwork...",
    });
  }

  try {
    const artworks = await fetchFeatured();
    if (artworks.length === 0) throw new Error("No artworks available");

    const artwork = artworks[Math.floor(Math.random() * artworks.length)];
    const imageUrl = getImageUrl(artwork);
    if (!imageUrl) throw new Error("No image for selected artwork");

    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Failed to fetch image");
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    const screen = await getScreenResolution();
    const density = parseInt(settings.density, 10);
    const screenRows = computeFillRows(density, screen.width, screen.height);
    const result = await imageToAscii(imageBuffer, density, screenRows, screen.width, screen.height);

    const wallpaperPath = await generateWallpaper(result.ascii, result.colorGrid, {
      backgroundColor: settings.backgroundColor,
      textColor: settings.textColor,
      colorMode: settings.colorMode,
      width: screen.width,
      height: screen.height,
    });

    await setWallpaper(wallpaperPath);

    await updateCommandMetadata({
      subtitle: `${artwork.title} — ${artwork.artistDisplayName}`,
    });

    if (!isBackground) {
      await showToast({
        style: Toast.Style.Success,
        title: "Wallpaper set!",
        message: artwork.title,
      });
    }
  } catch (error) {
    if (!isBackground) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: String(error),
      });
    }
  }
}
