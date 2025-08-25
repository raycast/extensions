import { BabyBuddyAPI } from "../api";

export default async function () {
  try {
    const api = new BabyBuddyAPI();
    const children = await api.getChildren();
    return children;
  } catch (error) {
    throw new Error("Failed to fetch children");
  }
}
