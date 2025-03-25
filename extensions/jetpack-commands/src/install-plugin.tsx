import { open } from "@raycast/api";
import { SiteExcerptData } from "./helpers/site-types";
import ViewCommandHandler, { generateRootCommand } from "./components/CommandHandler";
import { SiteFunctionOnClickProps } from "./hooks/useCommandPallette";

const siteFunctions = {
  onClick: async ({ rootUrl, needsClassicView, site }: SiteFunctionOnClickProps) => {
    const url = needsClassicView ? `/plugin-install.php` : `/plugins/${site.slug}`;
    await open(rootUrl + url);
  },
  filter: (site: SiteExcerptData) => site?.jetpack,
};

export default function InstallPluginCommand() {
  return <ViewCommandHandler commands={generateRootCommand(siteFunctions)}></ViewCommandHandler>;
}
