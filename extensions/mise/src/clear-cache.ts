import { clearCache } from "./mise/operations";
import { runOperationWithoutView } from "./ui/runOperation";

export default function Command() {
  return runOperationWithoutView(clearCache());
}
