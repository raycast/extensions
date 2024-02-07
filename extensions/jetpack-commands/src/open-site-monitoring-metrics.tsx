import { open } from "@raycast/api";
import ViewCommandHandler, { generateRootCommand } from "./components/CommandHandler";
import { SiteExcerptData } from "./helpers/site-types";
import { SiteFunctionOnClickProps } from "./hooks/useCommandPallette";

const siteFunctions = {
  onClick: async ({ rootUrl, site }: SiteFunctionOnClickProps) => {
    await open(`${rootUrl}/site-monitoring/${site.slug}`);
  },
  filter: (site: SiteExcerptData) => site.is_wpcom_atomic,
};

export default function Command() {
  return <ViewCommandHandler commands={generateRootCommand(siteFunctions)}></ViewCommandHandler>;
}
