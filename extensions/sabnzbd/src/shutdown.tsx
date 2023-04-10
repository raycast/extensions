import { showToast, ToastStyle, preferences } from "@raycast/api";
import { Client, Results } from "sabnzbd-api";

export default async () => {
  const client = new Client(preferences.url.value as string, preferences.apiToken.value as string);

  try {
    const results = (await client.shutdown()) as Results;
    showToast(ToastStyle.Success, "Shutdown");
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not shutdown");
  }
};
