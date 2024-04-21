import { Clipboard } from "@raycast/api";

import emoticonCategories from "./data/emoticons.json";
import { getEmoticons } from "./utils/get-emoticons";

export default async function Command() {
  const emoticons = getEmoticons(emoticonCategories);
  const randomIndex = Math.floor(Math.random() * emoticons.length);

  Clipboard.paste(emoticons[randomIndex].emoticon);
}
