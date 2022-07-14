// Functions
import { useRandom } from "@/hooks/useRandom";

const setRandomWallpaper = async () => {
  await useRandom();
};

export default setRandomWallpaper;
