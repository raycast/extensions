import { toggleSilentMode } from "./utils/alert";

export default async function Command() {
  return toggleSilentMode("on");
}
