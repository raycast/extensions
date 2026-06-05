import {
  Clipboard,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
} from "@raycast/api";
import { generateAddress } from "./ddg-api";
import { getToastOptions } from "./errors";
import { getStoredSession, saveRecentAlias } from "./storage";
import type { Preferences } from "./preferences";

export async function getAccessToken() {
  const preferences = getPreferenceValues<Preferences>();
  const session = await getStoredSession();

  return preferences.accessToken || session?.accessToken;
}

export async function generateCopyAndStoreAlias(accessToken: string) {
  const generated = await generateAddress(accessToken);
  await Clipboard.copy(generated.fullAddress);
  await saveRecentAlias(generated);

  return generated;
}

export async function launchSetupCommand() {
  await launchCommand({
    name: "generate-alias",
    type: LaunchType.UserInitiated,
  });
}

export async function generateAliasFromSavedToken() {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Access Token",
      message: "Open setup or add an access token in extension preferences.",
      primaryAction: {
        title: "Open Setup",
        onAction: launchSetupCommand,
      },
    });
    return;
  }

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Generating Alias",
    });
    const generated = await generateCopyAndStoreAlias(accessToken);
    await showToast({
      style: Toast.Style.Success,
      title: "Alias Copied",
      message: generated.fullAddress,
    });
  } catch (error) {
    await showToast(getToastOptions(error));
  }
}
