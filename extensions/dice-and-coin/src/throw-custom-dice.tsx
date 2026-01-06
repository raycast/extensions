import { getPreferenceValues, openExtensionPreferences, showToast, Toast, updateCommandMetadata } from "@raycast/api";

export default async function Command() {
  const preferences = getPreferenceValues<Preferences.ThrowCustomDice>();

  const toast = await showToast({ style: Toast.Style.Animated, title: "Throwing custom die..." });
  try {
    const min = +preferences.min;
    if (isNaN(min)) throw new Error("Invalid min value");
    const max = +preferences.max;
    if (isNaN(max)) throw new Error("Invalid max value");
    if (min >= max) throw new Error("Min value must be less than max value");

    await updateCommandMetadata({ subtitle: `Dice & Coin: ${min} to ${max}` });

    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    await wait(600);
    toast.style = Toast.Style.Success;
    toast.title = `🎲 ${result}`;
    await wait(1000);
  } catch (error) {
    await updateCommandMetadata({ subtitle: "Dice & Coin" });
    toast.style = Toast.Style.Failure;
    toast.title = `${error}`;
    toast.message = "Please check your preferences and try again.";
    toast.primaryAction = {
      title: "Open Extension Preferences",
      onAction: openExtensionPreferences,
    };
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
