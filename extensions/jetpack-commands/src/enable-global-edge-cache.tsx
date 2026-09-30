import { showToast, Toast } from "@raycast/api";
import { SiteExcerptData } from "./helpers/site-types";
import ViewCommandHandler, { generateRootCommand } from "./components/CommandHandler";
import { SiteFunctionOnClickProps } from "./hooks/useCommandPallette";
import { getEdgeCacheStatus, setEdgeCache } from "./api/hosting";

const siteFunctions = {
  onClick: async ({ site }: SiteFunctionOnClickProps) => {
    const toast = await showToast({ title: "Enabling edge cache…", style: Toast.Style.Animated });
    const isActive = await getEdgeCacheStatus(site.ID);
    if (isActive === null) {
      toast.style = Toast.Style.Failure;
      toast.title = "Enabling edge cache failed.";
      return;
    }
    if (isActive === true) {
      toast.style = Toast.Style.Success;
      toast.title = "Edge cache is already active.";
      return;
    }
    const newStatus = await setEdgeCache(site.ID, !isActive);
    if (newStatus === null) {
      toast.style = Toast.Style.Failure;
      toast.title = "Enabling edge cache failed.";
      return;
    }
    toast.style = Toast.Style.Success;
    toast.title = "Edge cache is active.";
    return;
  },
  filter: (site: SiteExcerptData) => !site.is_coming_soon && !site.is_private && site.is_wpcom_atomic,
  loadingContext: true,
};

export default function Command() {
  return <ViewCommandHandler commands={generateRootCommand(siteFunctions)}></ViewCommandHandler>;
}
