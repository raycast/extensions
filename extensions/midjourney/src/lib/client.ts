import "./fetch";

import { getPreferenceValues } from "@raycast/api";
import { Midjourney } from "midjourney";

const preferences = getPreferenceValues<ExtensionPreferences>();

export const client = new Midjourney({
  ServerId: preferences.serverId,
  ChannelId: preferences.channelId,
  SalaiToken: preferences.sessionToken,
  Debug: false,
  Ws: true,
});
