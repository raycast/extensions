import { getPreferenceValues, LocalStorage, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { play, Player, stop } from "./player";
import { Radio, radioById } from "./radios";

const STARTED_RADIO_KEY = "currently-playing-radio";
const STARTED_PLAYER_KEY = "default-app";

export async function startRadio(radio: Radio): Promise<void> {
  const { defaultApp } = getPreferenceValues<ExtensionPreferences>();
  try {
    await play(radio.streamUrl, defaultApp);
  } catch (error) {
    await showFailureToast(error, { title: `Could not play ${radio.title} in ${defaultApp}` });
    return;
  }
  await LocalStorage.setItem(STARTED_RADIO_KEY, radio.id);
  await LocalStorage.setItem(STARTED_PLAYER_KEY, defaultApp);
  await showHUD(`Playing ${radio.title} in ${defaultApp}`);
}

export async function stopRadio(): Promise<void> {
  const player = (await LocalStorage.getItem<Player>(STARTED_PLAYER_KEY)) ?? "QuickTime Player";
  try {
    await stop(player);
  } catch (error) {
    await showFailureToast(error, { title: `Could not stop ${player}` });
    return;
  }
  await showHUD("Stopped playing");
}

export async function lastStartedRadio(): Promise<Radio> {
  return radioById(await LocalStorage.getItem<string>(STARTED_RADIO_KEY));
}
