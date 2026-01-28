import { showToast, Toast } from "@raycast/api";
import { getWatchTime } from "../utils/api";

export function watchTimeHUD(props: { url: string }) {
  const { url } = props;

  getWatchTime(url)
    .then((watchTime) => {
      const { days, hours, minutes } = watchTime;
      const daysText = days ? `${days} days` : "";
      const hoursText = hours ? `${hours} hours` : "";
      const minutesText = minutes ? `${minutes} minutes` : "";

      const text = `${daysText} ${hoursText} ${minutesText}`;
      if (daysText.length === 0 && hoursText.length === 0 && minutesText.length === 0) {
        showToast({ style: Toast.Style.Failure, title: "Watch Time", message: "No watch time found" });
        return;
      }
      showToast({ style: Toast.Style.Success, title: "Watch Time", message: text });
    })
    .catch((error) => {
      console.error(error);
      showToast({ style: Toast.Style.Failure, title: "Watch Time", message: "Error fetching watch time" });
    });
}
