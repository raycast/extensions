import { open } from "@raycast/api";
import ViewCommandHandler, { generateRootCommand } from "./components/CommandHandler";
import { SiteFunctionOnClickProps } from "./hooks/useCommandPallette";

const siteFunctions = {
  onClick: async ({ rootUrl, site }: SiteFunctionOnClickProps) => {
    await open(`${rootUrl}/site-monitoring/${site.slug}/php`);
  },
  filter: () => true,
};

export default function Command() {
  return <ViewCommandHandler commands={generateRootCommand(siteFunctions)}></ViewCommandHandler>;
}
