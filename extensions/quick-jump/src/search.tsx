import { Action, ActionPanel, Icon, List, useNavigation, Keyboard, getPreferenceValues } from "@raycast/api";
import { Group, Url } from "./types";
import { URLList } from "./url-list";
import { useData } from "./use-data";
import { getDomainKeywords, getTagAccessories, getEnhancedKeywords, combineKeywords, getFallbackIcon } from "./utils";
import { createTemplateDisplayUrls } from "./template-utils";
import { useApplications } from "./hooks/use-applications";
import { URLListItem } from "./components/url-list-item";
import { OpenConfigFileAction } from "./components/open-config-action";
import { HelpView } from "./components/help-view";
import { GroupDetailView } from "./components/group-detail-view";
import { SECTION_TITLES, ACTION_TITLES } from "./constants";

export default function Command() {
  const { data, loading, error, validationResult } = useData();
  const { push } = useNavigation();
  const { applications } = useApplications();
  const preferences = getPreferenceValues<Preferences>();

  const openConfigFileShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "c" };

  if (error) {
    return (
      <List>
        <List.EmptyView title="Error loading data" description={error.message} icon={Icon.Warning} />
      </List>
    );
  }

  if (!data) {
    return <List isLoading={loading}></List>;
  }

  const hasValidationIssues = validationResult && (!validationResult.isValid || validationResult.warnings.length > 0);

  return (
    <List isLoading={loading}>
      {hasValidationIssues && validationResult && (
        <List.Section title="Configuration Status">
          <List.Item
            title="Configuration Issues Detected"
            subtitle={`${validationResult.errors.length || 0} errors, ${validationResult.warnings.length || 0} warnings`}
            icon={validationResult.isValid ? Icon.Exclamationmark2 : Icon.XMarkCircle}
            accessories={[{ text: validationResult.isValid ? "Warnings" : "Errors" }]}
            actions={
              <ActionPanel>
                <Action
                  title="View Details"
                  icon={Icon.Info}
                  onAction={() => {
                    push(<HelpView validationResult={validationResult} />);
                  }}
                />
                <ActionPanel.Section>
                  <OpenConfigFileAction shortcut={openConfigFileShortcut} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {!preferences.showAllGroupUrls && (
        <List.Section title={SECTION_TITLES.GROUPS}>
          {Object.entries(data.groups || {}).map(([key, group]: [string, Group]) => {
            const tags = group.tags || [];
            const accessories = getTagAccessories(tags);
            const title = group.title || key;
            const keywords = combineKeywords(getEnhancedKeywords(key), getEnhancedKeywords(title), tags);
            return (
              <List.Item
                key={key}
                icon={getFallbackIcon(group.icon, false)}
                title={title}
                keywords={keywords}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <Action
                      title={ACTION_TITLES.BROWSE_GROUP}
                      icon={Icon.Folder}
                      onAction={() => {
                        push(<URLList group={group} rootData={data} isLoading={loading} />);
                      }}
                    />
                    <Action.Push
                      title="Show Details"
                      icon={Icon.Eye}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      target={
                        <GroupDetailView
                          groupKey={key}
                          group={group}
                          rootData={data}
                          onBrowseGroup={() => {
                            push(<URLList group={group} rootData={data} isLoading={loading} />);
                          }}
                        />
                      }
                    />
                    <ActionPanel.Section>
                      <OpenConfigFileAction shortcut={openConfigFileShortcut} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {preferences.showAllGroupUrls && (
        <List.Section title="All Group URLs">
          {Object.entries(data.groups || {}).flatMap(([groupKey, group]: [string, Group]) => {
            const groupTitle = group.title || groupKey;
            const groupTags = group.tags || [];
            const items = [];

            // Pre-compute group keywords once
            const groupKeywords = getEnhancedKeywords(`${groupKey} ${groupTitle}`);

            if (group.linkedUrls && group.linkedUrls.length > 0) {
              for (const linkedUrlKey of group.linkedUrls) {
                const linkedUrl = data.urls?.[linkedUrlKey];
                if (!linkedUrl) continue;

                const tags = [...groupTags, ...(linkedUrl.tags || [])];
                const title = linkedUrl.title || linkedUrlKey;
                const searchableTitle = `${groupTitle} ${title}`;
                items.push(
                  <URLListItem
                    key={`group-${groupKey}-linked-${linkedUrlKey}`}
                    item={{
                      key: `group-${groupKey}-linked-${linkedUrlKey}`,
                      title: `${groupTitle} → ${title}`,
                      url: linkedUrl.url,
                      keywords: combineKeywords(
                        getEnhancedKeywords(searchableTitle),
                        groupKeywords,
                        tags,
                        getDomainKeywords(linkedUrl.url),
                      ),
                      icon: getFallbackIcon(linkedUrl.icon, !!linkedUrl.openIn),
                      tags: tags,
                      openIn: linkedUrl.openIn,
                    }}
                    applications={applications}
                  />,
                );

                const templateUrls = createTemplateDisplayUrls(
                  linkedUrl,
                  data,
                  `group-${groupKey}-linked-${linkedUrlKey}`,
                  linkedUrl.icon,
                );
                templateUrls.forEach((templateUrl) => {
                  const searchableTitle = `${groupTitle} ${title} ${templateUrl.title}`;
                  items.push(
                    <URLListItem
                      key={templateUrl.key}
                      item={{
                        ...templateUrl,
                        title: `${groupTitle} → ${title} - ${templateUrl.title}`,
                        keywords: combineKeywords(
                          getEnhancedKeywords(searchableTitle),
                          groupKeywords,
                          templateUrl.keywords,
                        ),
                      }}
                      applications={applications}
                    />,
                  );
                });
              }
            }

            if (group.otherUrls) {
              Object.entries(group.otherUrls).forEach(([otherUrlKey, otherUrl]) => {
                const tags = [...groupTags, ...(otherUrl.tags || [])];
                const title = otherUrl.title || otherUrlKey;
                const searchableTitle = `${groupTitle} ${title}`;
                items.push(
                  <URLListItem
                    key={`group-${groupKey}-other-${otherUrlKey}`}
                    item={{
                      key: `group-${groupKey}-other-${otherUrlKey}`,
                      title: `${groupTitle} → ${title}`,
                      url: otherUrl.url,
                      keywords: combineKeywords(
                        getEnhancedKeywords(searchableTitle),
                        groupKeywords,
                        tags,
                        getDomainKeywords(otherUrl.url),
                      ),
                      icon: getFallbackIcon(otherUrl.icon, !!otherUrl.openIn),
                      tags: tags,
                      openIn: otherUrl.openIn,
                    }}
                    applications={applications}
                  />,
                );
              });
            }

            const templateUrls = createTemplateDisplayUrls(group, data, `group-${groupKey}-template`);
            templateUrls.forEach((templateUrl) => {
              items.push(
                <URLListItem
                  key={templateUrl.key}
                  item={{
                    ...templateUrl,
                    title: `${groupTitle} → ${templateUrl.title}`,
                    keywords: combineKeywords(groupKeywords, templateUrl.keywords),
                  }}
                  applications={applications}
                />,
              );
            });

            return items;
          })}
        </List.Section>
      )}

      <List.Section title={SECTION_TITLES.ALL_URLS}>
        {Object.entries(data.urls || {}).flatMap(([key, url]: [string, Url]) => {
          const tags = url.tags || [];
          const title = url.title || key;
          const keywords = combineKeywords(
            getEnhancedKeywords(key),
            getEnhancedKeywords(title),
            tags,
            getDomainKeywords(url.url),
          );

          const items = [
            <URLListItem
              key={key}
              item={{
                key,
                title: title,
                url: url.url,
                keywords: keywords,
                icon: getFallbackIcon(url.icon, !!url.openIn),
                tags: tags,
                openIn: url.openIn,
              }}
              applications={applications}
            />,
          ];

          const templateUrls = createTemplateDisplayUrls(url, data, key, url.icon);
          const templateItems = templateUrls.map((templateUrl) => (
            <URLListItem
              key={templateUrl.key}
              item={{
                ...templateUrl,
                title: `${title} - ${templateUrl.title}`,
              }}
              applications={applications}
            />
          ));

          items.push(...templateItems);
          return items;
        })}
      </List.Section>
    </List>
  );
}
