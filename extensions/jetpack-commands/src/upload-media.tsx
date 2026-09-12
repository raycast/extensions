import { open } from "@raycast/api";
import ViewCommandHandler, { generateRootCommand } from "./components/CommandHandler";
import { SiteFunctionOnClickProps } from "./hooks/useCommandPallette";

const siteFunctions = {
  onClick: async ({ rootUrl, needsClassicView, site }: SiteFunctionOnClickProps) => {
    const url = needsClassicView ? `/media-new.php` : `/media/${site.slug}`;
    await open(rootUrl + url);
  },
  filter: () => true,
};

export default function UploadMediaCommand() {
  return <ViewCommandHandler commands={generateRootCommand(siteFunctions)}></ViewCommandHandler>;
}
