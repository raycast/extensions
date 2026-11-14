import { convertFinderSelection } from "./lib/finder-command";
import { getSettings } from "./lib/settings";

export default async function Command() {
  await convertFinderSelection({ mode: "custom", mm: getSettings().customBleedMm });
}
