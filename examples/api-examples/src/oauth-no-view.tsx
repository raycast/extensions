import { showToast, Toast } from "@raycast/api";
import * as google from "./oauth/google";

export default async function Command() {
  await google.authorize();
  const items = await google.fetchItems();
  showToast({ title: items?.[0]?.title ?? "No items", style: Toast.Style.Success });
}
