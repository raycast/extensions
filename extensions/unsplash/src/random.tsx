import { showHUD } from "@raycast/api";

// Functions
import { useRandom } from "@/hooks/useRandom";

const setRandomWallpaper = async () => {
  showHUD("Downloading and setting a new wallpaper...");
  await useRandom();
};

export default setRandomWallpaper;
