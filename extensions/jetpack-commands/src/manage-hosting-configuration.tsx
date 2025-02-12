import { open } from "@raycast/api";
import { SiteExcerptData } from "./helpers/site-types";
import { isNotAtomicJetpack, isP2Site } from "./helpers/site-helpers";
import ViewCommandHandler, { generateRootCommand } from "./components/CommandHandler";
import { SiteFunctionOnClickProps } from "./hooks/useCommandPallette";

const siteFunctions = {
  onClick: async ({ rootUrl, site }: SiteFunctionOnClickProps) => {
    await open(`${rootUrl}/hosting-config/${site.slug}`);
  },
  filter: (site: SiteExcerptData) => !isP2Site(site) && !isNotAtomicJetpack(site),
};

export default function Command() {
  return <ViewCommandHandler commands={generateRootCommand(siteFunctions)}></ViewCommandHandler>;
}
