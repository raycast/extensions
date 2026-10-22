import { prune } from "./mise/operations";
import { readPreferences } from "./ui/preferences";
import { runOperationWithoutView } from "./ui/runOperation";

export default function Command() {
  return runOperationWithoutView(prune(readPreferences<Preferences.Prune>().pruneScope));
}
