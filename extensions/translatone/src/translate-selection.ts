import { translateSelectionInPlace } from "./raycast/selection";

export default function TranslateSelectionCommand(): Promise<void> {
  return translateSelectionInPlace();
}
