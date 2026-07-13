import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  environment,
  getPreferenceValues,
  showToast,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { CATEGORY_COLORS, Category, TAXONOMY, categoriesFor, loadCategoryMap } from "./categories";
import { Skill, SkillSource, loadSkillMarkdown, loadSkills, searchKeywords } from "./skills";

const SOURCE_ORDER: SkillSource[] = ["personal", "pack", "plugin", "extra"];

const SOURCE_TITLES: Record<SkillSource, string> = {
  personal: "Personal",
  pack: "Packs",
  plugin: "Plugins",
  extra: "Projects",
};

const SOURCE_COLORS: Record<SkillSource, Color> = {
  personal: Color.Blue,
  pack: Color.Green,
  plugin: Color.Orange,
  extra: Color.Purple,
};

interface Entry {
  skill: Skill;
  categories: Category[];
}

async function loadEntries(extraDirs: string | undefined) {
  const [{ skills, warnings }, categoryMap] = await Promise.all([
    loadSkills(extraDirs),
    loadCategoryMap(environment.assetsPath, environment.supportPath),
  ]);
  const entries: Entry[] = skills.map((skill) => ({ skill, categories: categoriesFor(skill, categoryMap) }));
  return { entries, warnings };
}

export default function SearchSkills() {
  const { extraDirs } = getPreferenceValues<{ extraDirs?: string }>();
  const { data, isLoading } = useCachedPromise(loadEntries, [extraDirs], {
    initialData: { entries: [] as Entry[], warnings: [] as string[] },
  });
  const [filter, setFilter] = useState<string>("all");
  const [showingDetail, setShowingDetail] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = data.entries.find((entry) => entry.skill.id === selectedId)?.skill;
  // The result carries the id it was loaded for, so a slow load can never
  // paint one skill's markdown under another item.
  const { data: detail, isLoading: markdownLoading } = useCachedPromise(
    async (skill: Skill | undefined) => (skill ? { id: skill.id, markdown: await loadSkillMarkdown(skill) } : null),
    [selected],
  );

  useEffect(() => {
    if (!isLoading && data.warnings.length > 0) {
      showToast({
        style: Toast.Style.Failure,
        title: `${data.warnings.length} skill file(s) could not be read`,
        message: data.warnings[0],
      });
    }
  }, [isLoading, data.warnings]);

  const activeCategory = filter.startsWith("cat:") ? (filter.slice(4) as Category) : undefined;
  const filtered = data.entries.filter((entry) => {
    if (filter === "all") return true;
    if (filter.startsWith("source:")) return entry.skill.source === filter.slice(7);
    if (activeCategory) return entry.categories.includes(activeCategory);
    return true;
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      onSelectionChange={setSelectedId}
      searchBarPlaceholder="Search skills by name, topic, or trigger word"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by source or category" onChange={setFilter}>
          <List.Dropdown.Item title="All Skills" value="all" />
          <List.Dropdown.Section title="Categories">
            {TAXONOMY.map((category) => (
              <List.Dropdown.Item key={category} title={category} value={`cat:${category}`} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Sources">
            {SOURCE_ORDER.map((source) => (
              <List.Dropdown.Item key={source} title={SOURCE_TITLES[source]} value={`source:${source}`} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={isLoading ? "Scanning skills" : "No skills found"}
        description={
          isLoading
            ? undefined
            : data.warnings.length > 0
              ? `${data.warnings.length} file(s) could not be read. First: ${data.warnings[0]}`
              : "Nothing matched. Skills are read from ~/.claude/skills, ~/.agents/skills, and installed plugins."
        }
        icon={Icon.MagnifyingGlass}
      />
      {SOURCE_ORDER.map((source) => {
        const items = filtered.filter((entry) => entry.skill.source === source);
        if (items.length === 0) return null;
        return (
          <List.Section key={source} title={SOURCE_TITLES[source]}>
            {items.map((entry) => (
              <SkillItem
                key={entry.skill.id}
                entry={entry}
                activeCategory={activeCategory}
                markdown={detail && detail.id === entry.skill.id ? detail.markdown : undefined}
                markdownLoading={entry.skill.id === selectedId && (markdownLoading || detail?.id !== entry.skill.id)}
                showingDetail={showingDetail}
                onToggleDetail={() => setShowingDetail((current) => !current)}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function SkillItem(props: {
  entry: Entry;
  activeCategory: Category | undefined;
  markdown: string | undefined;
  markdownLoading: boolean;
  showingDetail: boolean;
  onToggleDetail: () => void;
}) {
  const { entry, activeCategory, markdown, markdownLoading, showingDetail, onToggleDetail } = props;
  const { skill, categories } = entry;
  // Under a category filter, tag rows with the matched category so the list
  // reads consistently; otherwise show the skill's primary category.
  const primary = activeCategory && categories.includes(activeCategory) ? activeCategory : categories[0];
  return (
    <List.Item
      id={skill.id}
      title={skill.name}
      subtitle={showingDetail ? undefined : firstSentence(skill.description)}
      keywords={[...searchKeywords(skill), ...categories.flatMap(categoryKeywords)]}
      accessories={primary ? [{ tag: { value: primary, color: CATEGORY_COLORS[primary] } }] : []}
      detail={
        <List.Item.Detail
          isLoading={markdownLoading}
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Invoke"
                text={skill.userInvocable ? `/${skill.name}` : "Model-invoked (no slash command)"}
              />
              {categories.length > 0 && (
                <List.Item.Detail.Metadata.TagList title="Categories">
                  {categories.map((category) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={category}
                      text={category}
                      color={CATEGORY_COLORS[category]}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              )}
              <List.Item.Detail.Metadata.TagList title="Source">
                <List.Item.Detail.Metadata.TagList.Item text={skill.sourceLabel} color={SOURCE_COLORS[skill.source]} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Path" text={shortenHome(skill.path)} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {skill.userInvocable ? (
            <Action.CopyToClipboard title="Copy Slash Command" content={`/${skill.name}`} />
          ) : (
            <Action.CopyToClipboard title="Copy Skill Name" content={skill.name} />
          )}
          {skill.userInvocable && (
            <Action.CopyToClipboard
              title="Copy Skill Name"
              content={skill.name}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          <Action
            title={showingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onToggleDetail}
          />
          <ActionPanel.Section>
            <Action.Open title="Open Skill File" target={skill.path} shortcut={Keyboard.Shortcut.Common.Open} />
            <Action.ShowInFinder path={skill.path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
            <Action.CopyToClipboard title="Copy Path" content={skill.path} shortcut={Keyboard.Shortcut.Common.Copy} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.ShowInFinder title="Open Categories Folder" path={environment.supportPath} icon={Icon.Folder} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function categoryKeywords(category: Category): string[] {
  return category
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
}

function firstSentence(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const period = clean.indexOf(". ");
  return period > 0 ? clean.slice(0, period + 1) : clean;
}

function shortenHome(path: string): string {
  return path.replace(process.env.HOME ?? "", "~");
}
