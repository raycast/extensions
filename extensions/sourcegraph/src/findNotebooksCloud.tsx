import FindNotebooksCommand from "./components/findNotebooks";
import { sourcegraphCloud } from "./sourcegraph";

export default function SearchCloud() {
  return FindNotebooksCommand(sourcegraphCloud());
}
