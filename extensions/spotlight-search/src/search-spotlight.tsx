import { getPreferenceValues } from "@raycast/api";

import spotlight from "node-spotlight";

interface SpotlightSearchPreferences {
  name: string;
  maxResults: number;
}

import { SpotlightSearchResult } from "./types";

const SPOTLIGHT_SEARCH_META_ATTRIBUTES = [
  "kMDItemDisplayName",
  "kMDItemFSContentChangeDate",
  "kMDItemFSCreationDate",
  "kMDItemFSInvisible",
  "kMDItemFSIsExtensionHidden",
  "kMDItemFSLabel",
  "kMDItemFSName",
  "kMDItemFSNodeCount",
  "kMDItemFSOwnerGroupID",
  "kMDItemFSOwnerUserID",
  "kMDItemFSSize",
  "kMDItemPath",

  "kMDItemAttributeChangeDate",
  "kMDItemAudiences",
  "kMDItemAuthors",
  "kMDItemAuthorAddresses",
  "kMDItemCity",
  "kMDItemComment",
  "kMDItemContactKeywords",
  "kMDItemContentCreationDate",
  "kMDItemContentModificationDate",
  "kMDItemContentType",
  "kMDItemContributors",
  "kMDItemCopyright",
  "kMDItemCountry",
  "kMDItemCoverage",
  "kMDItemCreator",
  "kMDItemDescription",
  "kMDItemDueDate",
  "kMDItemDurationSeconds",
  "kMDItemEmailAddresses",
  "kMDItemEncodingApplications",
  "kMDItemFinderComment",
  "kMDItemFonts",
  "kMDItemHeadline",
  "kMDItemIdentifier",
  "kMDItemInstantMessageAddresses",
  "kMDItemInstructions",
  "kMDItemKeywords",
  "kMDItemKind",
  "kMDItemLanguages",
  "kMDItemLastUsedDate",
  "kMDItemNumberOfPages",
  "kMDItemOrganizations",
  "kMDItemPageHeight",
  "kMDItemPageWidth",
  "kMDItemParticipants",
  "kMDItemPhoneNumbers",
  "kMDItemProjects",
  "kMDItemPublishers",
  "kMDItemRecipients",
  "kMDItemRecipientAddresses",
  "kMDItemRights",
  "kMDItemSecurityMethod",
  "kMDItemStarRating",
  "kMDItemStateOrProvince",
  "kMDItemTextContent",
  "kMDItemTitle",
  "kMDItemVersion",
  "kMDItemWhereFroms",
  "kMDItemAuthorEmailAddresses",
  "kMDItemRecipientEmailAddresses",
  "kMDItemTheme",
  "kMDItemSubject",
  "kMDItemCFBundleIdentifier",
  "kMDItemFSHasCustomIcon",
  "kMDItemFSIsStationery",
  "kMDItemInformation",
  "kMDItemURL",
];

// helper
const isFolder = (item: SpotlightSearchResult): boolean => {
  return item.kMDItemKind === "Folder";
};

const searchSpotlight = (search: string, isFolderSearch: boolean): Promise<SpotlightSearchResult[]> => {
  const results: SpotlightSearchResult[] = [];

  const { maxResults } = getPreferenceValues<SpotlightSearchPreferences>();

  return new Promise((resolve, reject) => {
    const spotlightSearchDefinition: string[] = SPOTLIGHT_SEARCH_META_ATTRIBUTES;

    spotlight(search, null, spotlightSearchDefinition)
      .on("data", (result: SpotlightSearchResult) => {
        if (isFolderSearch && isFolder(result) && results.length < maxResults) {
          results.push(result);
        } else if (results.length >= maxResults) {
          // bail early with less results
          resolve(results);
        } else if (!isFolderSearch && !isFolder(result)) {
          results.push(result);
        }
      })
      .on("error", () => {
        reject(new Error("An error occured during your search"));
      })
      .on("end", () => {
        resolve(results);
      });
  });
};

export { searchSpotlight };
