import { getCurrentUser } from "../lib/api";

export default async function tool() {
  return getCurrentUser();
}
