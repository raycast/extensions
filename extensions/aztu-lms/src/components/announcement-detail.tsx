import { getAnnouncementContent } from "@/data/announcement";
import { Detail, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

export function AnnouncementDetail({ id, title }: { id: string; title: string }) {
  const { isLoading, data } = useCachedPromise(getAnnouncementContent, [id], {
    initialData: null,
    onError: async () => {
      await showToast({ style: Toast.Style.Failure, title: "Failed to fetch announcement content" });
    },
  });

  return <Detail isLoading={isLoading} markdown={`# ${title}\n\n${data?.content || ""}`} />;
}
