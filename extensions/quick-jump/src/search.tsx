import { Action, ActionPanel, Icon, List, useNavigation, getPreferenceValues } from "@raycast/api";
import { Group, Url } from "./types";
import { URLList } from "./url-list";
import { useData } from "./use-data";
import {
  getDomainKeywords,
  getTagAccessories,
  getEnhancedKeywords,
  combineKeywords,
  getFallbackIcon,
  applyTemplate,
  mergePlaceholders,
  detectCircularPlaceholderDependencies,
} from "./utils";
import { createTemplateDisplayUrls } from "./template-utils";
import { useApplications } from "./hooks/use-applications";
import { URLListItem } from "./components/url-list-item";
import { OpenConfigFileAction } from "./components/open-config-action";
import { HelpView } from "./components/help-view";
import { GroupDetailView } from "./components/group-detail-view";
import { SECTION_TITLES, ACTION_TITLES, SHORTCUTS } from "./constants";

export default function Command() {
  const { data, loading, error, validationResult } = useData();
  const { push } = useNavigation();
  const { applications } = useApplications();
  const preferences = getPreferenceValues<Preferences>();

  const openConfigFileShortcut = SHORTCUTS.OPEN_CONFIG;

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

  const circularErrors: Array<{ location: string; error: string }> = [];

  if (data.globalPlaceholders) {
    const error = detectCircularPlaceholderDependencies(data.globalPlaceholders);
    if (error) {
      circularErrors.push({ location: "globalPlaceholders", error });
    }
  }

  if (data.groups) {
    for (const [groupKey, group] of Object.entries(data.groups)) {
      if (group.templatePlaceholders) {
        const error = detectCircularPlaceholderDependencies(group.templatePlaceholders);
        if (error) {
          circularErrors.push({ location: `groups.${groupKey}`, error });
        }
      }
    }
  }

  if (data.urls) {
    for (const [urlKey, url] of Object.entries(data.urls)) {
      if (url.templatePlaceholders) {
        const error = detectCircularPlaceholderDependencies(url.templatePlaceholders);
        if (error) {
          circularErrors.push({ location: `urls.${urlKey}`, error });
        }
      }
    }
  }

  if (circularErrors.length > 0) {
    return (
      <List isShowingDetail>
        <List.Section
          title={`Circular Dependencies Found (${circularErrors.length})`}
          subtitle="Fix these circular references to use the extension"
        >
          {circularErrors.map((error, index) => {
            // Extract the cycle from the error message
            // e.g., "Circular dependency detected: foo -> bar -> foo"
            const cycleMatch = error.error.match(/: (.+)$/);
            const cycle = cycleMatch ? cycleMatch[1] : error.error;

            // Determine icon based on location type
            let icon = Icon.XMarkCircle;
            let locationPrefix = "";
            if (error.location === "globalPlaceholders") {
              icon = Icon.Globe;
              locationPrefix = "Global";
            } else if (error.location.startsWith("groups.")) {
              icon = Icon.Folder;
              locationPrefix = "Group";
            } else if (error.location.startsWith("urls.")) {
              icon = Icon.Link;
              locationPrefix = "URL";
            }

            const locationName = error.location.replace(/^(groups\.|urls\.)/, "");

            return (
              <List.Item
                key={`circular-${index}`}
                icon={{ source: icon, tintColor: "#FF3B30" }}
                title={locationName}
                accessories={[
                  { tag: { value: locationPrefix, color: "#FF3B30" } },
                  { text: `Error ${index + 1}/${circularErrors.length}` },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={`# 🔴 Circular Dependency in \`${locationName}\`

---

## 🚨 Problem
${error.error}

---

## 🔄 Cycle Path
\`\`\`
${cycle}
\`\`\`

---

## 💡 What This Means
Placeholders are referencing each other in a loop, making it impossible to resolve their values.

Think of it like this:
- **${cycle.split(" -> ")[0]}** says "I need the value of **${cycle.split(" -> ")[1] || "..."}**"
- But **${cycle.split(" -> ")[1] || "..."}** says "I need the value of **${cycle.split(" -> ")[0]}**"
- This creates an infinite loop!

---

## 🔧 How to Fix

### Step 1: Open Configuration
Press **⌘⇧C** to open your configuration file

### Step 2: Navigate to Location
Find the section: \`${error.location}\`

### Step 3: Break the Cycle
Choose one of these approaches:

1. **Use a direct value** (recommended)
   - Replace one placeholder with an actual value
   
2. **Remove the reference**
   - Delete one of the placeholder references
   
3. **Restructure dependencies**
   - Create a third placeholder that both can reference

---

## 📝 Example Fix

### ❌ Before (Circular)
\`\`\`json
{
  "foo": "\${bar}",
  "bar": "\${foo}"
}
\`\`\`

### ✅ After (Fixed)
\`\`\`json
{
  "foo": "actual-value",
  "bar": "\${foo}"
}
\`\`\`

Or use a base value:
\`\`\`json
{
  "base": "/path/to/project",
  "foo": "\${base}/foo",
  "bar": "\${base}/bar"
}
\`\`\`

---

## 📍 Location Details
- **Type:** ${locationPrefix}
- **Path:** \`${error.location}\`
- **Error:** ${index + 1} of ${circularErrors.length}
`}
                  />
                }
                actions={
                  <ActionPanel>
                    <OpenConfigFileAction shortcut={openConfigFileShortcut} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
        <List.Section title="Summary">
          <List.Item
            icon={{ source: Icon.ExclamationMark, tintColor: "#FF9500" }}
            title="All Issues Must Be Fixed"
            accessories={[{ tag: { value: `${circularErrors.length} Issues`, color: "#FF3B30" } }]}
            detail={
              <List.Item.Detail
                markdown={`# ⚠️ Extension Blocked

---

## Current Status
The Quick Jump extension is currently **blocked** and cannot be used.

## Issues Found
**${circularErrors.length}** circular ${circularErrors.length === 1 ? "dependency" : "dependencies"} detected in your configuration.

## What You Need to Do
1. Review each error listed above
2. Fix all circular dependencies in your configuration
3. Save the configuration file
4. The extension will automatically reload

---

## Quick Actions
- Press **⌘⇧C** to open configuration file
- Select any error above to see detailed fix instructions

---

## Need Help?
Each error above includes:
- 🔄 The exact cycle causing the problem
- 💡 Explanation of what went wrong
- 🔧 Step-by-step fix instructions
- 📝 Example fixes you can copy

Select an error from the list above to get started!
`}
              />
            }
            actions={
              <ActionPanel>
                <OpenConfigFileAction shortcut={openConfigFileShortcut} />
              </ActionPanel>
            }
          />
        </List.Section>
      </List>
    );
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
              const placeholdersResult = mergePlaceholders(data.globalPlaceholders, group.templatePlaceholders);
              if (!placeholdersResult.success) {
                return items;
              }
              const placeholders = placeholdersResult.placeholders;

              Object.entries(group.otherUrls).forEach(([otherUrlKey, otherUrl]) => {
                const tags = [...groupTags, ...(otherUrl.tags || [])];
                const title = otherUrl.title || otherUrlKey;
                const searchableTitle = `${groupTitle} ${title}`;
                const resolvedUrl = applyTemplate(otherUrl.url, placeholders);
                items.push(
                  <URLListItem
                    key={`group-${groupKey}-other-${otherUrlKey}`}
                    item={{
                      key: `group-${groupKey}-other-${otherUrlKey}`,
                      title: `${groupTitle} → ${title}`,
                      url: resolvedUrl,
                      keywords: combineKeywords(
                        getEnhancedKeywords(searchableTitle),
                        groupKeywords,
                        tags,
                        getDomainKeywords(resolvedUrl),
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

          const placeholdersResult = mergePlaceholders(data.globalPlaceholders, url.templatePlaceholders);
          if (!placeholdersResult.success) {
            return [];
          }
          const placeholders = placeholdersResult.placeholders;
          const resolvedUrl = applyTemplate(url.url, placeholders);

          const keywords = combineKeywords(
            getEnhancedKeywords(key),
            getEnhancedKeywords(title),
            tags,
            getDomainKeywords(resolvedUrl),
          );

          const items = [
            <URLListItem
              key={key}
              item={{
                key,
                title: title,
                url: resolvedUrl,
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
