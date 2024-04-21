import { Emoticon } from "../types/emoticons";

export const getEmoticonItemKey = (emoticon: Emoticon) =>
  `${emoticon.name}-${emoticon.emoticon}`;
