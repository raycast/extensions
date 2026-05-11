import { showToast, Toast } from "@raycast/api";
import { SiteExcerptData } from "./helpers/site-types";
import ViewCommandHandler, { generateRootCommand } from "./components/CommandHandler";
import { SiteFunctionOnClickProps } from "./hooks/useCommandPallette";
import { getEdgeCacheStatus, setEdgeCache } from "./api/hosting";

const siteFunctions = {
  onClick: async ({ site }: SiteFunctionOnClickProps) => {
    const toast = await showToast({ title: "Disabling edge cache…", style: Toast.Style.Animated });
    const isActive = await getEdgeCacheStatus(site.ID);
    if (isActive === null) {
      toast.style = Toast.Style.Failure;
      toast.title = "Disabling edge cache failed.";
      return;
    }
    if (isActive === false) {
      toast.style = Toast.Style.Success;
      toast.title = "Edge cache is already inactive.";
      return;
    }
    const newStatus = await setEdgeCache(site.ID, !isActive);
    if (newStatus === null) {
      toast.style = Toast.Style.Failure;
      toast.title = "Disabling edge cache failed.";
      return;
    }
    toast.style = Toast.Style.Success;
    toast.title = "Edge cache is inactive.";
    return;
  },
  filter: (site: SiteExcerptData) => !site.is_coming_soon && !site.is_private && site.is_wpcom_atomic,
  loadingContext: true,
};

export default function Command() {
  return <ViewCommandHandler commands={generateRootCommand(siteFunctions)}></ViewCommandHandler>;
}
