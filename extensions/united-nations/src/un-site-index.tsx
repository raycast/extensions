import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, List, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { fetchSiteIndex } from "./api.js";
import { LanguageCode, SiteIndex } from "./types.js";

export default function () {
  const { siteIndexLanguageCode } = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(true);
  const [siteIndex, setSiteIndex] = useCachedState<SiteIndex>(`un-site-index-list-${siteIndexLanguageCode}`, {});

  const loadSiteIndex = async () => {
    setIsLoading(true);
    const siteIndex = await fetchSiteIndex(siteIndexLanguageCode as LanguageCode);
    setSiteIndex(siteIndex);
    setIsLoading(false);
  };

  useEffect(() => {
    loadSiteIndex();
  }, []);

  return (
    <List isLoading={isLoading}>
      {Object.entries(siteIndex).map(([category, items]) => (
        <List.Section key={category} title={category}>
          {items.map((site, index) => (
            <List.Item
              key={`${site.title}-${index}`}
              title={siteIndexLanguageCode === "ar" ? "" : site.title}
              keywords={siteIndexLanguageCode === "ar" ? [site.title] : undefined}
              accessories={
                siteIndexLanguageCode === "ar" ? [{ text: { value: site.title, color: Color.PrimaryText } }] : undefined
              }
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
