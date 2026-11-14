import { focusedTab } from "../yab";

/** The tab in front of Yab's front window, with its space. */
export default async function tool() {
  return (await focusedTab()) ?? "No tab is in front: Yab has no window open.";
}
