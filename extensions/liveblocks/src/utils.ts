import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import axios, { AxiosError } from "axios";
import shajs from "sha.js";

interface Preferences {
  secret: string;
}

export async function getTokenFromSecret(): Promise<any> {
  // handle the preferences secret
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.secret) {
    return;
  }

  // handle the hashed secret
  const storedHashedSecret = await LocalStorage.getItem("liveblocks-secret");

  if (storedHashedSecret === shajs("sha256").update(preferences.secret).digest("hex")) {
    return;
  }

  if (!storedHashedSecret) {
    const hashedSecret = shajs("sha256").update(preferences.secret).digest("hex");

    await LocalStorage.setItem("liveblocks-secret", hashedSecret);
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Retrieving API token...",
  });

  try {
    const { data } = await axios.get("https://liveblocks.io/api/authorize", {
      headers: { Authorization: `Bearer ${preferences.secret}` },
    });

    await LocalStorage.setItem("liveblocks-jwt", data.token);

    toast.style = Toast.Style.Success;
    toast.message = "Successfully retrieved API token";
  } catch (e) {
    const error = e as AxiosError;
    const status = error.response?.status;

    if (status === 404) {
      toast.style = Toast.Style.Failure;
      toast.message = "Invalid secret key";
    } else {
      toast.style = Toast.Style.Failure;
      toast.message = `${status} error when performing authorization`;
    }

    return status;
  }
}
