import { getPreferenceValues, showHUD } from "@raycast/api";
import { SetLightState } from "./lib/api";
import { Api } from "./lib/interfaces";

export default async function TurnOnAllLights() {
  const preferences = getPreferenceValues();

  const config = {
    headers: {
      Authorization: "Bearer " + preferences.lifx_token,
    },
  };

  const body: Api.lightStateParam = {
    power: "on",
  };

  try {
    const response = await SetLightState("all", body, config);
    await showHUD("Succses" + response?.results[0].status || "");
  } catch (error) {
    console.info(error);
    if (error instanceof Error) {
      await showHUD(error.message);
    } else {
      await showHUD("error not instance of Error");
    }
  }

  return;
}
