import { open } from "@raycast/api";
import ViewCommandHandler, { generateRootCommand } from "./components/CommandHandler";
import { SiteFunctionOnClickProps } from "./hooks/useCommandPallette";

const siteFunctions = {
  onClick: async ({ rootUrl, needsClassicView, site }: SiteFunctionOnClickProps) => {
    const url = needsClassicView ? `/plugins.php` : `/plugins/${site.slug}`;
    await open(rootUrl + url);
  },
  filter: () => true,
};

export default function ManagePluginsCommand() {
  return <ViewCommandHandler commands={generateRootCommand(siteFunctions)}></ViewCommandHandler>;
}
