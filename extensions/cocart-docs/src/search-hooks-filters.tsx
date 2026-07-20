import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import {
  DocEntry,
  addRecentItem,
  categoryIcon,
  extractCode,
  loadEntries,
  refreshEntries,
  stripMdx,
} from "./shared";

const HOOK_CATEGORIES = new Set([
  "Action Hooks",
  "Filters",
  "Functions",
  "JWT Action Hooks",
  "JWT Filters",
]);

interface HookEntry {
  name: string;
  description: string;
  content: string;
  category: string;
  url: string;
  section: string;
}

function parseHooksFromEntry(entry: DocEntry): HookEntry[] {
  const hooks: HookEntry[] = [];
  const lines = entry.content.split("\n");
  let currentSection = "";
  let i = 0;

  // Skip YAML frontmatter (--- ... ---)
  if (lines[0]?.trim() === "---") {
    i = 1;
    while (i < lines.length && lines[i]?.trim() !== "---") i++;
    i++; // skip closing ---
  }

  while (i < lines.length) {
    // Match hook/function entries first (## or ### with backtick name, or bare `cocart_name`)
    const hookMatch =
      lines[i].match(/^#{2,3} `([^`]+)`/) ||
      lines[i].match(/^`(cocart[^`]+)`\s*$/);

    if (!hookMatch) {
      // Track # or ## plain-text section headings (no backticks)
      const sectionMatch = lines[i].match(/^#{1,2} ([^`].*)$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        i++;
        continue;
      }
    }
    if (hookMatch) {
      const name = hookMatch[1];
      i++;

      const contentLines: string[] = [];
      while (i < lines.length) {
        if (
          lines[i].match(/^#{2,3} `[^`]+`/) ||
          lines[i].match(/^#{2,3} \S+$/) ||
          lines[i].match(/^`cocart[^`]+`\s*$/) ||
          lines[i].match(/^# .+$/)
        )
          break;
        contentLines.push(lines[i]);
        i++;
      }

      const content = contentLines
        .join("\n")
        .replace(/^\*{3}\s*$/gm, "")
        .trim();
      const firstLine = content
        .split("\n")
        .find(
          (l) =>
            l.trim().length > 0 && !l.startsWith("<") && !l.startsWith("**"),
        );

      hooks.push({
        name,
        description: firstLine?.trim() || "",
        content: `### \`${name}\`\n\n${content}`,
        category: entry.category,
        url: entry.url,
        section: currentSection,
      });
    } else {
      i++;
    }
  }

  return hooks;
}

export default function SearchHooksFilters() {
  const [entries, setEntries] = useState<DocEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    loadEntries()
      .then(setEntries)
      .catch((error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load CoCart docs",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const hookEntries = useMemo(() => {
    const parentEntries = entries.filter((e) =>
      HOOK_CATEGORIES.has(e.category),
    );
    const allHooks: HookEntry[] = [];
    for (const entry of parentEntries) {
      allHooks.push(...parseHooksFromEntry(entry));
    }
    return allHooks.filter(
      (h) => selectedCategory === "all" || h.category === selectedCategory,
    );
  }, [entries, selectedCategory]);

  const grouped = useMemo(() => {
    const groups: Record<string, HookEntry[]> = {};
    for (const hook of hookEntries) {
      const key =
        hook.category === hook.section
          ? hook.category
          : `${hook.category} — ${hook.section}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(hook);
    }
    return Object.entries(groups);
  }, [hookEntries]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search action hooks, filters, and functions..."
      searchBarAccessory={
        <List.Dropdown tooltip="Category" onChange={setSelectedCategory}>
          <List.Dropdown.Item title="All" value="all" icon={Icon.List} />
          <List.Dropdown.Section title="Core">
            <List.Dropdown.Item
              title="Action Hooks"
              value="Action Hooks"
              icon={Icon.Bolt}
            />
            <List.Dropdown.Item
              title="Filters"
              value="Filters"
              icon={Icon.Filter}
            />
            <List.Dropdown.Item
              title="Functions"
              value="Functions"
              icon={Icon.CodeBlock}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="JWT Authentication">
            <List.Dropdown.Item
              title="Action Hooks"
              value="JWT Action Hooks"
              icon={Icon.Bolt}
            />
            <List.Dropdown.Item
              title="Filters"
              value="JWT Filters"
              icon={Icon.Filter}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {grouped.map(([group, items]) => (
        <List.Section key={group} title={group} subtitle={`${items.length}`}>
          {items.map((hook) => (
            <List.Item
              key={`${hook.category}-${hook.name}`}
              title={hook.name}
              subtitle={hook.description}
              icon={categoryIcon(hook.category)}
              keywords={[hook.section, hook.category]}
              detail={<List.Item.Detail markdown={stripMdx(hook.content)} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={hook.url.replace(/\.md$/, "")}
                    title="Open in Browser"
                    onOpen={() =>
                      addRecentItem({
                        title: hook.name,
                        url: hook.url.replace(/\.md$/, ""),
                        category: hook.category,
                        source: "hooks",
                      })
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy Code"
                    content={extractCode(hook.content)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Hook Name"
                    content={hook.name}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  />
                  <Action
                    title="Refresh Cache"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={async () => {
                      setIsLoading(true);
                      try {
                        const parsed = await refreshEntries();
                        setEntries(parsed);
                        showToast({
                          style: Toast.Style.Success,
                          title: "Cache refreshed",
                        });
                      } catch (error) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to refresh",
                          message:
                            error instanceof Error
                              ? error.message
                              : "Unknown error",
                        });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
