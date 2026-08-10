import { popToRoot } from "@raycast/api";
import { isNotAtomicJetpack } from "../helpers/site-helpers";
import { SiteExcerptData } from "../helpers/site-types";

export type SiteFunctionOnClickProps = { needsClassicView: boolean; rootUrl: string; site: SiteExcerptData };
type OnClickSiteFunction = ({ site }: SiteFunctionOnClickProps) => Promise<void>;

export interface SiteFunctions {
  onClick: ({ site }: SiteFunctionOnClickProps) => Promise<void>;
  filter?: (site: SiteExcerptData) => boolean | undefined | null;
  loadingContext?: boolean;
}

export interface Command {
  name: string;
  label: string;
  subLabel?: string;
  isSiteAction?: boolean;
  loadingContext?: SiteFunctions["loadingContext"];
  callback: () => Promise<void>;
  icon?: string;
  siteFunctions?: SiteFunctions;
}

interface useCommandPalletteOptions {
  selectedCommandName: string | null;
  commands: Command[];
  sites: SiteExcerptData[];
}

const siteToAction =
  (onClickSite: OnClickSiteFunction, loadingContext: SiteFunctions["loadingContext"]) =>
  (site: SiteExcerptData): Command => {
    return {
      loadingContext,
      isSiteAction: true,
      name: `${site.ID}`,
      label: `${site.name ? `${site.name} - ${site.URL}` : site.URL}`,
      icon: site.icon?.img ?? "favicon-development.jpg",
      callback: async () => {
        try {
          const needsClassicView = isNotAtomicJetpack(site) || "wp-admin" === site.options?.wpcom_admin_interface;
          let rootUrl = "https://wordpress.com";
          if (needsClassicView) {
            rootUrl = `${site.URL}/wp-admin`;
          }

          await onClickSite({ needsClassicView, rootUrl, site });
          // eslint-disable-next-line no-empty
        } catch (e) {}
        popToRoot({ clearSearchBar: true });
      },
    };
  };

export const useCommandPallette = ({
  sites,
  commands,
  selectedCommandName,
}: useCommandPalletteOptions): { commands: Command[] } => {
  const selectedCommand = commands.find((c) => c.name === selectedCommandName);
  let sitesToPick = null;
  if (selectedCommand?.siteFunctions) {
    const { onClick, filter, loadingContext = false } = selectedCommand.siteFunctions;
    const filteredSites = filter ? sites.filter(filter) : sites;
    sitesToPick = filteredSites.map(siteToAction(onClick, loadingContext));
  }
  let newCommands = commands;
  if (sites.length === 0) {
    newCommands = commands.filter((c) => !c.siteFunctions);
  }

  return { commands: sitesToPick ?? newCommands };
};
