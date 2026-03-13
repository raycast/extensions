import { lookup } from "dns/promises";

export async function isOnline() {
  try {
    await lookup("google.com");
    return true;
  } catch {
    return false;
  }
}
