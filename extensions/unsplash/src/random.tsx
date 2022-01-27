import { closeMainWindow, popToRoot } from "@raycast/api";

// Functions
import { useRandom } from "@/hooks/useRandom";

const setDailyWallpaper = async () => {
  await closeMainWindow();
  await useRandom();
  await popToRoot();
};

export default setDailyWallpaper;
