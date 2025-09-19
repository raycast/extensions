import { LaunchProps, LocalStorage, showToast, Toast } from "@raycast/api";
import { isValidSeamApiKey } from "./seam";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Apikey }>) {
  const key = props.arguments.apiKey;
  if (!isValidSeamApiKey(key)) {
    return showToast({
      style: Toast.Style.Failure,
      title: "Invalid API Key",
    });
  }

  await LocalStorage.setItem("seam_api_key", key);
  await showToast({
    style: Toast.Style.Success,
    title: "Seam API Key Set",
    message: "Your Seam API key has been successfully set.",
  });
}
