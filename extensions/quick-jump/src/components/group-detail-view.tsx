import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { Group, Root } from "../types";
import { OpenConfigFileAction } from "./open-config-action";
import { extractPlaceholders, getEnhancedKeywords, combineKeywords } from "../utils";

interface GroupDetailViewProps {
  groupKey: string;
  group: Group;
  rootData: Root;
  onBrowseGroup?: () => void;
}

export function GroupDetailView({ groupKey, group, rootData, onBrowseGroup }: GroupDetailViewProps) {
  const title = group.title || groupKey;

  // Calculate summary stats
  const linkedUrlsCount = group.linkedUrls?.length || 0;
  const otherUrlsCount = Object.keys(group.otherUrls || {}).length;
  const templatesCount = group.appliedTemplates?.length || 0;
  const templateGroupsCount = group.appliedTemplateGroups?.length || 0;
  const totalUrls = linkedUrlsCount + otherUrlsCount;

  const markdownParts = [`# ${title}`, ``, `---`, ``];

  // Summary Section
  markdownParts.push(`### Overview`);
  const summaryItems = [];
  if (totalUrls > 0) {
    summaryItems.push(`**Total URLs:** ${totalUrls}`);
  }
  if (templatesCount > 0) {
    summaryItems.push(`**Templates:** ${templatesCount}`);
  }
  if (templateGroupsCount > 0) {
    summaryItems.push(`**Template Groups:** ${templateGroupsCount}`);
  }
  if (group.tags && group.tags.length > 0) {
    summaryItems.push(`**Tags:** ${group.tags.length}`);
  }

  if (summaryItems.length > 0) {
    markdownParts.push(summaryItems.join(" • "));
    markdownParts.push(``, `---`, ``);
  }

  // Linked URLs Section
  if (group.linkedUrls && group.linkedUrls.length > 0) {
    markdownParts.push(`### Linked URLs`);
    markdownParts.push(``);
    group.linkedUrls.forEach((urlKey, index) => {
      const url = rootData.urls?.[urlKey];
      if (url) {
        const urlTitle = url.title || urlKey;
        markdownParts.push(`**${index + 1}. ${urlTitle}**`);
        markdownParts.push(`   \`${url.url}\``);
        if (url.tags && url.tags.length > 0) {
          markdownParts.push(`   Tags: ${url.tags.map((t) => `\`${t}\``).join(" ")}`);
        }
        markdownParts.push(``);
      } else {
        markdownParts.push(`**${index + 1}. ${urlKey}** *(not found)*`);
        markdownParts.push(``);
      }
    });
  }

  // Other URLs Section
  if (group.otherUrls && Object.keys(group.otherUrls).length > 0) {
    markdownParts.push(`### Other URLs`);
    markdownParts.push(``);
    Object.entries(group.otherUrls).forEach(([key, otherUrl], index) => {
      const urlTitle = otherUrl.title || key;
      markdownParts.push(`**${index + 1}. ${urlTitle}**`);
      markdownParts.push(`   \`${otherUrl.url}\``);
      if (otherUrl.tags && otherUrl.tags.length > 0) {
        markdownParts.push(`   Tags: ${otherUrl.tags.map((t) => `\`${t}\``).join(" ")}`);
      }
      markdownParts.push(``);
    });
  }

  // Templates Section
  if (group.appliedTemplates && group.appliedTemplates.length > 0) {
    markdownParts.push(`### Applied Templates`);
    markdownParts.push(``);
    group.appliedTemplates.forEach((templateKey) => {
      const template = rootData.templates?.[templateKey];
      if (template) {
        const templateTitle = template.title || templateKey;
        markdownParts.push(`- **${templateTitle}**`);
        if (template.templateUrl) {
          markdownParts.push(`  \`${template.templateUrl}\``);
        }
      } else {
        markdownParts.push(`- \`${templateKey}\``);
      }
    });
    markdownParts.push(``);
  }

  // Template Groups Section
  if (group.appliedTemplateGroups && group.appliedTemplateGroups.length > 0) {
    markdownParts.push(`### Applied Template Groups`);
    markdownParts.push(``);
    group.appliedTemplateGroups.forEach((templateGroupKey) => {
      const templateGroup = rootData.templateGroups?.[templateGroupKey];
      if (templateGroup) {
        markdownParts.push(`- **${templateGroupKey}** (${templateGroup.appliedTemplates.length} templates)`);
      } else {
        markdownParts.push(`- \`${templateGroupKey}\``);
      }
    });
    markdownParts.push(``);
  }

  // Tags Section
  if (group.tags && group.tags.length > 0) {
    markdownParts.push(`### Tags`);
    markdownParts.push(``);
    markdownParts.push(group.tags.map((tag) => `\`${tag}\``).join(" • "));
    markdownParts.push(``);
  }

  // Search Keywords Section
  const keywords = combineKeywords(getEnhancedKeywords(groupKey), getEnhancedKeywords(title), group.tags || []);

  if (keywords.length > 0) {
    markdownParts.push(`### Search Keywords`);
    markdownParts.push(
      `> ${keywords.slice(0, 10).join(", ")}${keywords.length > 10 ? `, ... (${keywords.length - 10} more)` : ""}`,
    );
    markdownParts.push(``);
  }

  // Collect all required placeholders from applied templates
  const allRequiredPlaceholders = new Set<string>();
  const collectPlaceholdersFromTemplates = (templateKeys: string[]) => {
    templateKeys.forEach((templateKey) => {
      const template = rootData.templates?.[templateKey];
      if (template?.templateUrl) {
        const placeholders = extractPlaceholders(template.templateUrl);
        placeholders.forEach((p) => allRequiredPlaceholders.add(p));
      }
    });
  };

  if (group.appliedTemplates) {
    collectPlaceholdersFromTemplates(group.appliedTemplates);
  }
  if (group.appliedTemplateGroups) {
    group.appliedTemplateGroups.forEach((tgKey) => {
      const tg = rootData.templateGroups?.[tgKey];
      if (tg?.appliedTemplates) {
        collectPlaceholdersFromTemplates(tg.appliedTemplates);
      }
    });
  }

  // Separate local and global placeholders
  const localPlaceholders = group.templatePlaceholders || {};
  const usedGlobalPlaceholders: Record<string, string> = {};

  if (rootData.globalPlaceholders) {
    Object.entries(rootData.globalPlaceholders).forEach(([key, value]) => {
      // Only show global placeholders that are required by templates and not overridden locally
      if (allRequiredPlaceholders.has(key) && !localPlaceholders[key]) {
        usedGlobalPlaceholders[key] = value;
      }
    });
  }

  // Template Placeholders Section (Local)
  if (Object.keys(localPlaceholders).length > 0) {
    markdownParts.push(`### Template Placeholders (Local)`);
    markdownParts.push(``);
    markdownParts.push(`| Placeholder | Value |`);
    markdownParts.push(`|-------------|-------|`);
    Object.entries(localPlaceholders).forEach(([key, value]) => {
      markdownParts.push(`| \`${key}\` | \`${value}\` |`);
    });
    markdownParts.push(``);
  }

  // Global Placeholders Section (Used by this group)
  if (Object.keys(usedGlobalPlaceholders).length > 0) {
    markdownParts.push(`### Template Placeholders (Global)`);
    markdownParts.push(``);
    markdownParts.push(`| Placeholder | Value |`);
    markdownParts.push(`|-------------|-------|`);
    Object.entries(usedGlobalPlaceholders).forEach(([key, value]) => {
      markdownParts.push(`| \`${key}\` | \`${value}\` |`);
    });
    markdownParts.push(``);
  }

  const markdown = markdownParts.join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {onBrowseGroup && <Action title="Browse Group" icon={Icon.Folder} onAction={onBrowseGroup} />}
          <ActionPanel.Section>
            <OpenConfigFileAction shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
