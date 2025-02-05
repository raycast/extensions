import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import axios from "axios";
import https from "https";

export default async function loginToLpuWifi() {
  const { username, password } = getPreferenceValues();

  await showToast({
    style: Toast.Style.Animated,
    title: "Logging in to LPU Wifi...",
  });

  const data = `mode=191&username=${username}%40lpu.com&password=${password}`;

  try {
    const response = await axios.post("https://10.10.0.1/24online/servlet/E24onlineHTTPClient", data, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    if (response.data.includes("To start surfing")) {
      await showToast({
        style: Toast.Style.Success,
        title: "Login successful",
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Login failed",
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to post",
    });
  }
}
