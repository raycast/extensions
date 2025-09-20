import { open } from "@raycast/api";
import { SiteExcerptData } from "./helpers/site-types";
import { isNotAtomicJetpack } from "./helpers/site-helpers";
import ViewCommandHandler, { generateRootCommand } from "./components/CommandHandler";
import { SiteFunctionOnClickProps } from "./hooks/useCommandPallette";

const siteFunctions = {
  onClick: async ({ rootUrl, site }: SiteFunctionOnClickProps) => {
    await open(`https://cloud.jetpack.com/scan/${site.slug}`);
  },
  filter: (site: SiteExcerptData) => isNotAtomicJetpack(site),
};

export default function Command() {
  return <ViewCommandHandler commands={generateRootCommand(siteFunctions)}></ViewCommandHandler>;
}
