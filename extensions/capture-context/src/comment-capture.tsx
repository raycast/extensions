import { CONFIG } from "./utils";
import { useCaptureList } from "./hooks/useCaptureList";
import { CaptureList } from "./components/CaptureList";

export default function Command() {
  const { items: captures, isLoading, refresh } = useCaptureList(CONFIG.directories.captures);

  return <CaptureList captures={captures} isLoading={isLoading} onRefresh={refresh} onCommentSaved={refresh} />;
}
