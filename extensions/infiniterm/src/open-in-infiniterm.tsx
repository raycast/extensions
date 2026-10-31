import { useCachedPromise } from "@raycast/utils";
import { basename } from "node:path";
import { WorkspacePicker } from "./components/workspace-picker.tsx";
import { getFinderDirs } from "./lib/finder.ts";

export default function Command() {
  const { data: dirs, isLoading, error } = useCachedPromise(getFinderDirs, [], { keepPreviousData: false });
  const folders = dirs ?? [];
  const title = folders.length === 1 ? basename(folders[0]) || folders[0] : `${folders.length} folders`;
  return <WorkspacePicker dirs={folders} title={title} loading={isLoading} dirsError={error} />;
}
