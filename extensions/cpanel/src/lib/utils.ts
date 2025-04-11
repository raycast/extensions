import { CPANEL_URL } from "./constants";

export function isInvalidUrl() {
  try {
    new URL(CPANEL_URL);
    return false;
  } catch (error) {
    return true;
  }
}
