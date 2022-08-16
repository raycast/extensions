import { Toast, showToast, getPreferenceValues } from "@raycast/api";
import axios from "axios";

interface ToggleLightArguments {
  light: string;
}

export default async function ToggleLight(props: { arguments: ToggleLightArguments }) {
  const { light } = props.arguments;
  const preferences = getPreferenceValues();
  let chosenLight = light.toLowerCase();

  if (light === "") {
    chosenLight = "all";
  }

  const config = {
    headers: {
      Authorization: "Bearer " + preferences.lifx_token,
    },
  };

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Toggeling " + chosenLight,
  });
  try {
    const response = await axios.post(`https://api.lifx.com/v1/lights/${chosenLight}/toggle`, {}, config);
    console.log(response.data);
    if (response.status === 200) {
      toast.style = Toast.Style.Success;
      toast.title = "Succses";
    } else {
      if (response.data.results[0].status === "ok") {
        toast.style = Toast.Style.Success;
        toast.title = chosenLight + " toggled " + response.data.results[0].power;
      } else {
        console.log(response.status);
        throw "Failed to toggle light";
      }
    }
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to update light";
    toast.message = "Failure";
    console.log(err);
  }
  return;
}
