import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { searchResources, getSites } from "./common/SoApi";
import { useState } from "react";
import { useStore } from "./common/store";
import { useVisitedUrls } from "./common/useVisitedUrls";
import { QuestionDetail } from "./common/questionDetail";
import { usePromise } from "@raycast/utils";

export default function View() {
  const [urls] = useVisitedUrls();
  const store = useStore(["results"], (_, q, s) => searchResources(q as string, s as string));
  const [sitename, setSitename] = useState("stackoverflow");
  const [query, setQuery] = useState("");
  const sectionNames = ["Search Results"];

  const { isLoading: isSitedataloading, data: sites = [] } = usePromise(getSites);

  const getIcon = (site: string) => {
    const correctSite = sites.filter((c) => c.api_site_parameter === site);
    return correctSite[0]?.icon_url;
  };

  return (
    <List
      isLoading={store.queryIsLoading}
      onSearchTextChange={(text) => {
        setQuery(text);
        if (text) {
          store.runQuery(text, sitename);
        } else {
          store.clearResults();
        }
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Collection"
          isLoading={isSitedataloading}
          storeValue={true}
          onChange={(newValue) => {
            setSitename(newValue);
            if (query) {
              store.runQuery(query, newValue);
            } else {
              store.clearResults();
            }
          }}
        >
          {sites.map((site) => (
            <List.Dropdown.Item
              key={site.site_url}
              title={site.name}
              value={site.api_site_parameter}
              icon={site.icon_url}
            />
          ))}
        </List.Dropdown>
      }
      throttle
    >
      {sectionNames.map((sectionName, sectionIndex) => (
        <List.Section key={sectionIndex} title={sectionName} subtitle={`${store.queryResults[sectionIndex].length}`}>
          {store.queryResults[sectionIndex].map((item) => (
            <List.Item
              key={item.id}
              id={item.id}
              title={item.title + (urls.includes(item.url) ? " (visited)" : "")}
              subtitle={item.subtitle}
              icon={getIcon(sitename)}
              accessories={[{ text: item.accessoryTitle }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Read Question"
                    target={<QuestionDetail quid={item.id} url={item.url} title={item.title} site={sitename} />}
                    icon={Icon.Download}
                  />
                  <Action.OpenInBrowser url={item.url} />
                  <Action.CopyToClipboard title="Copy URL" content={item.url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
