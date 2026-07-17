import { useRandom } from "@/hooks/useRandom";
import { environment, LaunchType, getPreferenceValues, LocalStorage } from "@raycast/api";

const setRandomWallpaper = async () => {
  const nowDate = new Date();
  const { updateTime } = getPreferenceValues<Preferences>();
  const lastTime = await LocalStorage.getItem<string>("last-time");

  if (environment.launchType === LaunchType.Background) {
    if (updateTime !== "none" && lastTime !== undefined) {
      const lastDate = new Date(lastTime);
      const dateTimeSplit = updateTime.split(" ");

      switch (dateTimeSplit[1]) {
        case "minute":
          lastDate.setMinutes(lastDate.getMinutes() + Number(dateTimeSplit[0]));
          break;
        case "hour":
          lastDate.setHours(lastDate.getHours() + Number(dateTimeSplit[0]));
          break;
        case "day":
          lastDate.setDate(lastDate.getDate() + Number(dateTimeSplit[0]));
          break;
      }

      lastDate.setSeconds(lastDate.getSeconds() - 10);

      if (lastDate <= nowDate) {
        await useRandom(nowDate.getTime());
      }
    }
  } else {
    await useRandom(nowDate.getTime());
  }
};

export default setRandomWallpaper;
