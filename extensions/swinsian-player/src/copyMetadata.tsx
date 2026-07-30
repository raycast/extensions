import { Detail, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getPlayerStatus } from "./helpers/swinsian";
import { CopyList } from "./components/Toolkit";

export default function CopyMetadataCommand() {
  const { data: status, isLoading, error } = useCachedPromise(getPlayerStatus);

  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Failed to get player status", message: error.message });
  }

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!status || !status.track) {
    return <Detail markdown="# No Track Playing\n\nStart playing a track in Swinsian to use Metadata tools." />;
  }

  return <CopyList track={status.track} type="metadata" />;
}
