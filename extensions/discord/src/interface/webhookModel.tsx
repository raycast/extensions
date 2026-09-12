import { environment, Color } from "@raycast/api";

export interface WebhookChannelModel {
  name: string;
  url: string;
  color: Color | Color.SecondaryText;
}

export const dataFilePath = environment.supportPath + "/discord-extension-saved-data.json";
