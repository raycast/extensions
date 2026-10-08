import { confirmAlert, showToast, Toast } from "@raycast/api";
import { SiteExcerptData } from "./helpers/site-types";
import ViewCommandHandler, { generateRootCommand } from "./components/CommandHandler";
import { SiteFunctionOnClickProps } from "./hooks/useCommandPallette";
import { clearEdgeCache, clearWordPressCache, getEdgeCacheStatus } from "./api/hosting";

const siteFunctions = {
  onClick: async ({ site }: SiteFunctionOnClickProps) => {
    const toast = await showToast({ title: "Fetching edge cache status…", style: Toast.Style.Animated });
    const isActive = await getEdgeCacheStatus(site.ID);
    if (isActive === null) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to fetch edge cache status.";
      return;
    }
    if (await confirmAlert({ title: "Are you sure you want to clear your site's cache?" })) {
      toast.title = "Clearing cache…";
      toast.style = Toast.Style.Animated;
      let newStatus;
      if (isActive) {
        newStatus = await clearEdgeCache(site.ID);
      } else {
        newStatus = await clearWordPressCache(site.ID, "Manually cleared by Raycast.");
      }
      if (newStatus === null) {
        toast.style = Toast.Style.Failure;
        toast.title = "Clear cache failed.";
        return;
      }
      toast.style = Toast.Style.Success;
      toast.title = `Cache cleared.`;
      return;
    }
    await showToast({
      title: "Clearing cache cancelled.",
      style: Toast.Style.Failure,
    });
    return;
  },
  filter: (site: SiteExcerptData) => site?.is_wpcom_atomic,
  loadingContext: true,
};

export default function Command() {
  return <ViewCommandHandler commands={generateRootCommand(siteFunctions)}></ViewCommandHandler>;
}
