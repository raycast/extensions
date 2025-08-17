import { Action, ActionPanel, Icon, List, useNavigation, Keyboard } from "@raycast/api";
import { Group, Url } from "./types";
import { URLList } from "./url-list";
import { useData } from "./use-data";
import { getDomainKeywords, getTagAccessories, getEnhancedKeywords, combineKeywords, getFallbackIcon } from "./utils";
import { createTemplateDisplayUrls } from "./template-utils";
import { useApplications } from "./hooks/use-applications";
import { URLListItem } from "./components/url-list-item";
import { OpenConfigFileAction } from "./components/open-config-action";
import { HelpView } from "./components/help-view";
import { SECTION_TITLES, ACTION_TITLES } from "./constants";

export default function Command() {
  const { data, loading, error, validationResult } = useData();
  const { push } = useNavigation();
  const { applications } = useApplications();

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
                  <ActionPanel.Section>
                    <OpenConfigFileAction shortcut={openConfigFileShortcut} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

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
                subtitle: url.url,
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
