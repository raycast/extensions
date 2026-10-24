import { activeLibrary } from "../utils/ai-library";

/** Get the active Eagle library identity and every existing folder's full path before choosing write targets. */
export default async function tool() {
  return activeLibrary();
}
