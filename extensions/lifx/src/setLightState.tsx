import { Toast, showToast, getPreferenceValues } from "@raycast/api";
import axios from "axios";

interface LightStateArguments {
  color: string;
  power: string;
  brightness: string;
}

export default async function setLightState(props: { arguments: LightStateArguments }) {
  const { color, power, brightness } = props.arguments;
  const preferences = getPreferenceValues();

  const config = {
    headers: {
      Authorization: "Bearer " + preferences.lifx_token,
    },
  };
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Turning light: " + color,
  });
  try {
    const body = {
      ...(color && { color: color.toLowerCase() }),
      ...(power && { power: power.toLowerCase() }),
      ...(brightness && { brightness: parseFloat(brightness) }),
    };
    console.log(body);
    const response = await axios.put("https://api.lifx.com/v1/lights/all/state", body, config);
    console.log(response.data);
    if (response.status === 200 || response.status === 207) {
      toast.style = Toast.Style.Success;
      toast.title = "Succses";
    } else {
      console.log(response.status);
      throw "Failed to set light state";
    }
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to update light state";
    toast.message = "Failure";
  }
  return;
}
