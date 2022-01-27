import { closeMainWindow, popToRoot } from "@raycast/api";

// Functions
import { useRandom } from "@/hooks/useRandom";

const setDailyWallpaper = async () => {
  await popToRoot();
  await closeMainWindow();
  await useRandom();
};

export default setDailyWallpaper;
