import { Toast, open, openExtensionPreferences, showHUD, showToast } from "@raycast/api";
import { getWebUrl } from "../config";

const INVALID_KEY_TITLE = "HideMail API key is invalid or was removed";

export class InvalidApiKeyError extends Error {
  constructor() {
    super(INVALID_KEY_TITLE);
    this.name = "InvalidApiKeyError";
  }
}

const openApiTokensPage = () => open(getWebUrl("/user/api-tokens"));

export const showInvalidApiKeyToast = async (toast?: Toast) => {
  const options: Toast.Options = {
    style: Toast.Style.Failure,
    title: INVALID_KEY_TITLE,
    message: "Create a new token and paste it in the extension settings",
    primaryAction: {
      title: "Open Settings",
      onAction: () => openExtensionPreferences(),
    },
    secondaryAction: {
      title: "Create New Token",
      onAction: () => openApiTokensPage(),
    },
  };

  if (!toast) {
    await showToast(options);
    return;
  }

  Object.assign(toast, options);
};

export const openApiKeySetup = async () => {
  await showHUD(`❌ ${INVALID_KEY_TITLE}. Paste a new token in the extension settings`);
  await openApiTokensPage();
  await openExtensionPreferences();
};
