import { open } from "@raycast/api";
import { SiteExcerptData } from "./helpers/site-types";
import ViewCommandHandler, { generateRootCommand } from "./components/CommandHandler";
import { SiteFunctionOnClickProps } from "./hooks/useCommandPallette";

const siteFunctions = {
  onClick: async ({ rootUrl, site }: SiteFunctionOnClickProps) => {
    await open(`${rootUrl}/hosting-config/${site.slug}#admin-interface-style`);
  },
  filter: (site: SiteExcerptData) => site?.is_wpcom_atomic,
};

export default function Command() {
  return <ViewCommandHandler commands={generateRootCommand(siteFunctions)}></ViewCommandHandler>;
}
