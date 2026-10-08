import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, List, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { fetchSiteIndex } from "./api.js";
import { LanguageCode, SiteIndex } from "./types.js";
import { latinSearchFilter, lantinSearchLanguages, rightToLeftLanguages } from "./utils.js";

export default function () {
  const preferences = getPreferenceValues<Preferences>();
  const siteIndexLanguageCode = preferences.siteIndexLanguageCode as LanguageCode;
  const [isLoading, setIsLoading] = useState(true);
  const [siteIndex, setSiteIndex] = useCachedState<SiteIndex>(`un-site-index-list-${siteIndexLanguageCode}`, {});
  const [searchText, setSearchText] = useState<string>("");

  const loadSiteIndex = async () => {
    setIsLoading(true);
    const siteIndex = await fetchSiteIndex(siteIndexLanguageCode);
    setSiteIndex(siteIndex);
    setIsLoading(false);
  };

  useEffect(() => {
    loadSiteIndex();
  }, []);

  const hasLatinSearch = lantinSearchLanguages.has(siteIndexLanguageCode);
  const isRTL = rightToLeftLanguages.has(siteIndexLanguageCode);

  return (
    <List isLoading={isLoading} onSearchTextChange={hasLatinSearch ? setSearchText : undefined}>
      {Object.entries(siteIndex).map(([category, items]) => (
        <List.Section key={category} title={category}>
          {(hasLatinSearch && searchText
            ? items.filter((site) =>
                latinSearchFilter(siteIndexLanguageCode, [site.title, site.link].join(" "), searchText),
              )
            : items
          ).map((site, index) => (
            <List.Item
              key={`${site.title}-${index}`}
              title={isRTL ? "" : site.title}
              subtitle={site.link}
              accessories={isRTL ? [{ text: { value: site.title, color: Color.PrimaryText } }] : undefined}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={site.link} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
