import { showToast, Toast } from "@raycast/api";
import { sync } from "./laravel-tip";

export default async function Search() {
  await showToast({
    style: Toast.Style.Animated,
    title: "Syncing",
    message: "Starting to sync all tips from LaravelDaily Repo",
  });

  const { error } = await sync();

  if (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error.message,
    });

    return;
  }

  await showToast({
    style: Toast.Style.Success,
    title: "Synced",
    message: "All tips have been synced",
  });
}
