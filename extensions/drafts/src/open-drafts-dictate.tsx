import { closeMainWindow, popToRoot } from "@raycast/api";
import { CallbackUrl } from "./utils/CallbackUrlUtils";
import { CallbackBasUrls } from "./utils/Defines";

export default async () => {
  const callbackUrl = new CallbackUrl(CallbackBasUrls.DICTATE);
  await callbackUrl.openCallbackUrl();
  await popToRoot({ clearSearchBar: true });
  await closeMainWindow();
};
