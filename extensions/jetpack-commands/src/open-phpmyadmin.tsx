import { open, PopToRootType, showHUD } from "@raycast/api";
import { SiteExcerptData } from "./helpers/site-types";
import { fetchPMAToken } from "./api/hosting";
import ViewCommandHandler, { generateRootCommand } from "./components/CommandHandler";
import { SiteFunctionOnClickProps } from "./hooks/useCommandPallette";

const siteFunctions = {
  onClick: async ({ rootUrl, site }: SiteFunctionOnClickProps) => {
    const pmaToken = await fetchPMAToken(site.ID);
    if (!pmaToken) {
      return await showHUD("Could not open phpMyAdmin. Please try again later", {
        clearRootSearch: true,
        popToRootType: PopToRootType.Immediate,
      });
    }
    await open(`${rootUrl}/pma-login?token=${pmaToken}`);
  },
  filter: (site: SiteExcerptData) => site?.is_wpcom_atomic,
};

export default function Command() {
  return <ViewCommandHandler commands={generateRootCommand(siteFunctions)}></ViewCommandHandler>;
}
