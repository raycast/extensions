import { open } from "@raycast/api";
import { SiteExcerptData } from "./helpers/site-types";
import { isNotAtomicJetpack, isP2Site } from "./helpers/site-helpers";
import ViewCommandHandler, { generateRootCommand } from "./components/CommandHandler";
import { SiteFunctionOnClickProps } from "./hooks/useCommandPallette";

const siteFunctions = {
  onClick: async ({ rootUrl, site }: SiteFunctionOnClickProps) => {
    const jetpackRootUrl = isNotAtomicJetpack(site) ? "https://cloud.jetpack.com" : rootUrl;
    await open(`${jetpackRootUrl}/backup/${site.slug}`);
  },
  filter: (site: SiteExcerptData) => !isP2Site(site),
};

export default function Command() {
  return <ViewCommandHandler commands={generateRootCommand(siteFunctions)}></ViewCommandHandler>;
}
