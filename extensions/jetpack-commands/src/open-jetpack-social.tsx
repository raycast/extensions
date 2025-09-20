import { open } from "@raycast/api";
import { SiteExcerptData } from "./helpers/site-types";
import { isNotAtomicJetpack, isP2Site } from "./helpers/site-helpers";
import ViewCommandHandler, { generateRootCommand } from "./components/CommandHandler";
import { SiteFunctionOnClickProps } from "./hooks/useCommandPallette";

const siteFunctions = {
  onClick: async ({ rootUrl, site }: SiteFunctionOnClickProps) => {
    const url = isNotAtomicJetpack(site)
      ? `https://cloud.jetpack.com/jetpack-social/${site.slug}`
      : `${rootUrl}/marketing/connections/${site.slug}`;
    await open(url);
  },
  filter: (site: SiteExcerptData) => !isP2Site(site),
};

export default function Command() {
  return <ViewCommandHandler commands={generateRootCommand(siteFunctions)}></ViewCommandHandler>;
}
