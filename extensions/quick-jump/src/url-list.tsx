import { List } from "@raycast/api";
import { Group, Root, DisplayUrl } from "./types";
import { getDomainKeywords, getEnhancedKeywords, combineKeywords, getFallbackIcon } from "./utils";
import { createTemplateDisplayUrls } from "./template-utils";
import { useApplications } from "./hooks/use-applications";
import { URLListItem } from "./components/url-list-item";
import { SECTION_TITLES } from "./constants";

interface URLListProps {
  group: Group;
  rootData: Root;
  isLoading?: boolean;
}

export function URLList({ group, rootData, isLoading = false }: URLListProps) {
  const { applications, loading: applicationsLoading } = useApplications();

  const combinedLoading = isLoading || applicationsLoading;

  const otherUrls: DisplayUrl[] = Object.entries(group.otherUrls || {}).map(([key, otherUrl]) => {
    const title = otherUrl.title || key;
    const tags = otherUrl.tags || [];
    return {
      key: `other-${key}`,
      title: title,
      url: otherUrl.url,
      keywords: combineKeywords(
        getEnhancedKeywords(key),
        getEnhancedKeywords(title),
        tags,
        getDomainKeywords(otherUrl.url),
      ),
      icon: getFallbackIcon(otherUrl.icon, !!otherUrl.openIn),
      tags: tags,
      openIn: otherUrl.openIn,
    };
  });

  const linkedUrls: DisplayUrl[] = [];

  if (group.linkedUrls && group.linkedUrls.length > 0) {
    for (const linkedUrlKey of group.linkedUrls) {
      const linkedUrl = rootData.urls?.[linkedUrlKey];
      if (!linkedUrl) continue;

      const tags = linkedUrl.tags || [];
      const title = linkedUrl.title || linkedUrlKey;
      linkedUrls.push({
        key: `linked-${linkedUrlKey}`,
        title: title,
        url: linkedUrl.url,
        keywords: combineKeywords(
          getEnhancedKeywords(linkedUrlKey),
          getEnhancedKeywords(title),
          tags,
          getDomainKeywords(linkedUrl.url),
        ),
        icon: getFallbackIcon(linkedUrl.icon, !!linkedUrl.openIn),
        tags: tags,
        openIn: linkedUrl.openIn,
      });

      const templateUrls = createTemplateDisplayUrls(linkedUrl, rootData, `linked-${linkedUrlKey}`, linkedUrl.icon);
      linkedUrls.push(...templateUrls);
    }
  }

  const templateUrls = createTemplateDisplayUrls(group, rootData, "template");

  const renderItems = (items: DisplayUrl[]) =>
    items.map((item) => <URLListItem key={item.key} item={item} applications={applications} />);

  return (
    <List isLoading={combinedLoading}>
      <List.Section title={SECTION_TITLES.LINKED_URLS}>{renderItems(linkedUrls)}</List.Section>

      <List.Section title={SECTION_TITLES.OTHER_URLS}>{renderItems(otherUrls)}</List.Section>

      <List.Section title={SECTION_TITLES.TEMPLATE_URLS}>{renderItems(templateUrls)}</List.Section>
    </List>
  );
}
