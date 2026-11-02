import { FolderView } from "./components/FolderView";
import { ROOT } from "./lib/cli";
import { pruneOpenCache } from "./lib/files";

export default function Command() {
  pruneOpenCache().catch(() => undefined);
  return <FolderView path={ROOT} title="My Files" />;
}
