import { getAllTabs } from "../safari";

/**
 * Get all open tabs from Safari
 */
export default async function tool() {
  return await getAllTabs();
}
