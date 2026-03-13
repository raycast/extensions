import { getPreferenceValues } from "@raycast/api";
import { Item } from "../types";

const getItemTitle = (item: Item) => {
  const { lang } = getPreferenceValues<Preferences>();
  let title = item.display_title;
  if (lang !== "default") title = item.localized_title.find((t) => t.lang === lang)?.text ?? title;
  return title;
};
export default getItemTitle;
