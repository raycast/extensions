import { getPreferenceValues, Icon } from "@raycast/api";

import { AnyFn } from "../types";

export const getIconByType = (type: string | undefined): string | Icon => {
  if (type) {
    switch (type) {
      case "image":
        return Icon.Image;
      case "video":
        return Icon.Video;
      case "audio":
        return Icon.SpeakerOn;
      case "text":
      case "application":
        return Icon.Document;
      default:
        return Icon.Paperclip;
    }
  } else {
    return Icon.Paperclip;
  }
};

export const invoke = <T>(fn: AnyFn<T>) => {
  return fn();
};

const { messageLimit: msgLimit } = getPreferenceValues<Preferences>();
export const messageLimit = parseInt(msgLimit);
