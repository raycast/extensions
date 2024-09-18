import { open } from "@raycast/api";
import { SiteExcerptData } from "./helpers/site-types";
import { isCustomDomain, isNotAtomicJetpack } from "./helpers/site-helpers";
import ViewCommandHandler, { generateRootCommand } from "./components/CommandHandler";
import { SiteFunctionOnClickProps } from "./hooks/useCommandPallette";

const siteFunctions = {
  onClick: async ({ rootUrl, site }: SiteFunctionOnClickProps) => {
    await open(`${rootUrl}/domains/manage/${site.slug}/dns/${site.slug}`);
  },
  filter: (site: SiteExcerptData) => isCustomDomain(site) && !isNotAtomicJetpack(site),
};

export default function Command() {
  return <ViewCommandHandler commands={generateRootCommand(siteFunctions)}></ViewCommandHandler>;
}
