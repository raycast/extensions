import { prune } from "./mise/operations";
import { readPreferences } from "./ui/preferences";
import { runOperationWithoutView } from "./ui/runOperation";

export default function Command() {
  const { pruneScope } = readPreferences<Preferences.Prune>();
  return runOperationWithoutView(() => prune(pruneScope));
}
