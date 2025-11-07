import { toggleSilentMode } from "./utils/alert";

export default async function Command() {
  return await toggleSilentMode();
}
