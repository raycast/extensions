import { environment, Icon, Color } from "@raycast/api";

export interface WebhookChannelModel {
  name: string;
  url: string;
  color: Color | Color.SecondaryText;
  favourite: boolean;
}

export const dataFilePath = environment.supportPath + "/discord-extension-saved-data.json";
