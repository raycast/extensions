import { BabyBuddyAPI } from "../api";

export default async function () {
  const api = new BabyBuddyAPI();
  const children = await api.getChildren();
  return children;
}
