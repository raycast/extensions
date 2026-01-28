import { Clipboard, getApplications, getPreferenceValues, open, showHUD, showToast, Toast } from "@raycast/api";

import type { ExtLaunchProps, Preferences, SupportedApps } from "./types";

export async function invoke(props: ExtLaunchProps, appName: SupportedApps) {
  const preferences = getPreferenceValues<Preferences>();

  console.debug("preferences:", preferences);
  console.debug("props:", props);

  const { clipboard, bundleId } = preferences;

  const isAppInstalled = await isInstalled(bundleId);
  if (!isAppInstalled) {
    await showToast({
      style: Toast.Style.Failure,
      title: `The ${appName} app was not detected. Please verify if the installed release version matches the one specified in the preferences.`,
    });
    return;
  }

  let { phoneNumber = "" } = props.arguments;

  if (clipboard && !phoneNumber) {
    const text = (await Clipboard.readText()) || "";
    console.debug("text from clipboard:", text);

    if (text) phoneNumber = text;
  }

  const formatted = formatPhoneNumber(phoneNumber);
  console.debug("formatted:", formatted);

  if (!formatted) {
    await showToast({
      style: Toast.Style.Failure,
      title: `"${phoneNumber}" is not a valid phone number`,
    });
    return;
  }

  try {
    // osascript -e 'id of app "SomeApp"'
    switch (appName) {
      case "Telegram": {
        // https://core.telegram.org/api/links#phone-number-links
        await open(`tg://resolve?phone=${formatted}`, bundleId);
        break;
      }
      case "WhatsApp": {
        // https://faq.whatsapp.com/general/chats/how-to-use-click-to-chat
        // await open(`https://wa.me/${formatted}`, bundleId);
        await open(`whatsapp://send/?phone=${formatted}`, bundleId);
        break;
      }
    }

    await showHUD(`Start chatting with ${formatted} in ${appName}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to open ${appName}.`,
    });
  }
}

export function formatPhoneNumber(phoneNumber: string) {
  return phoneNumber.replace(/\D/g, "");
}

async function isInstalled(bundleId: string): Promise<boolean> {
  const installedApplications = await getApplications();

  const app = installedApplications.find((application) => application.bundleId == bundleId);

  return !!app;
}
