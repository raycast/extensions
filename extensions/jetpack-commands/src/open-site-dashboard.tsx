import { open } from "@raycast/api";
import ViewCommandHandler, { generateRootCommand } from "./components/CommandHandler";
import { SiteFunctionOnClickProps } from "./hooks/useCommandPallette";

const siteFunctions = {
  onClick: async ({ rootUrl, needsClassicView, site }: SiteFunctionOnClickProps) => {
    if (needsClassicView) {
      await open(`${rootUrl}`);
    } else {
      await open(`${rootUrl}/home/${site.slug}`);
    }
  },
  filter: () => true,
};

export default function Command() {
  return <ViewCommandHandler commands={generateRootCommand(siteFunctions)}></ViewCommandHandler>;
}
