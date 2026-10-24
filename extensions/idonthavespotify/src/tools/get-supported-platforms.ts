import { Adapter } from "../@types/global";
import { platformTitles } from "../shared/links";

/** List the extension's supported conversion destinations. Availability for a particular music link must be checked with convert-link. */
export default function getSupportedPlatforms() {
  return Object.values(Adapter).map((id) => ({ id, name: platformTitles[id] }));
}
