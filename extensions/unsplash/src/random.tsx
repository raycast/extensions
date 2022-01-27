import { closeMainWindow } from "@raycast/api";

// Functions
import { useRandom } from "@/hooks/useRandom";

const setDailyWallpaper = async () => {
  await closeMainWindow();
  await useRandom();
};

export default setDailyWallpaper;
