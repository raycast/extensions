import { Clipboard, Toast } from "@raycast/api";
import { showToast } from "@raycast/api";
import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";

export default async function () {
  const preferences = getPreferenceValues<Preferences>();

  const { text } = await Clipboard.read();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Saving URL to Instapaper",
  });

  const res = await fetch("https://www.instapaper.com/api/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
    },
    body: new URLSearchParams({
      url: text,
      username: preferences.email,
      password: preferences.password,
    }),
  });

  if (res.status !== 201) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save URL to Instapaper";
    if (res.status === 403) {
      toast.message = "Invalid email or password";
    } else if (res.status === 500) {
      toast.message = "The service encountered an error. Please try again later.";
    }

    return;
  } else {
    toast.style = Toast.Style.Success;
    toast.title = "Saved URL to Instapaper";
    toast.message = text;
  }
}
