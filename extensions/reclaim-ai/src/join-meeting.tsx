import { closeMainWindow, getPreferenceValues, showHUD, open } from "@raycast/api";
import { NativePreferences } from "./types/preferences";
import { axiosPromiseData, fetcher } from "./utils/axiosPromise";
import { ApiResponseMoment } from "./hooks/useEvent.types";

export default async function Command() {
  const { apiUrl } = getPreferenceValues<NativePreferences>();

  await closeMainWindow();
  await showHUD("Joining meeting...");

  const [eventRequest, error] = await axiosPromiseData<ApiResponseMoment>(fetcher(`${apiUrl}/moment/next`));

  if (error || !eventRequest) {
    console.error(error);
    await showHUD("Error getting the next event");
    return;
  }

  const { event, nextEvent } = eventRequest;

  if (event?.onlineMeetingUrl) {
    await open(event.onlineMeetingUrl);
  } else {
    if (nextEvent?.onlineMeetingUrl) {
      await open(nextEvent.onlineMeetingUrl);
    } else {
      await showHUD("No meetings found.");
    }
  }
}
