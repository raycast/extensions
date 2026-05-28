import { useEffect, useState } from "react";
import { homedir } from "node:os";
import { join } from "node:path";
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { getIndex } from "./lib/cache";
import { aggregateSkills } from "./lib/aggregate";
import { computeHealth } from "./lib/health";
import { buildFixCommand } from "./lib/fix-commands";
import { copyToClipboard, openInEditor } from "./lib/actions";
import { SkillDetail } from "./components/SkillDetail";
import type { DisplaySkill, HealthIssue } from "./lib/types";

function iconFor(s: DisplaySkill) {
  return s.source.includes("plugin")
    ? { source: Icon.Plug, tintColor: Color.Purple }
    : { source: Icon.Box, tintColor: Color.Blue };
}

function firstSentence(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  const stop = t.search(/[.。!?]/);
  return stop > 0 ? t.slice(0, stop + 1) : t.slice(0, 80);
}

function slashCommand(s: DisplaySkill): string {
  if (s.source.includes("plugin") && s.marketplace)
    return `/${s.marketplace}:${s.name}`;
  return `/${s.name}`;
}

function sectionTitle(s: DisplaySkill): string {
  if (s.source.includes("plugin"))
    return `Plugins · ${s.marketplace ?? "unknown"}`;
  return "User · Claude + Codex";
}

function accessoriesFor(
  s: DisplaySkill,
  issues: HealthIssue[],
): List.Item.Accessory[] {
  const acc: List.Item.Accessory[] = s.surfaces.map((surf) => ({ tag: surf }));
  const hasError = issues.some((i) => i.severity === "error");
  if (issues.length > 0) {
    acc.push({
      icon: hasError
        ? { source: Icon.XMarkCircle, tintColor: Color.Red }
        : { source: Icon.Warning, tintColor: Color.Yellow },
      tooltip: `${issues.length} health issue(s)`,
    });
  }
  return acc;
}

export default function Command() {
  const [isLoading, setLoading] = useState(true);
  const [items, setItems] = useState<DisplaySkill[]>([]);
  const [issuesByName, setIssuesByName] = useState<Map<string, HealthIssue[]>>(
    new Map(),
  );
  const [showingDetail, setShowingDetail] = useState(false);

  async function load(force = false) {
    setLoading(true);
    try {
      const index = await getIndex({ force });
      setItems(aggregateSkills(index.skills));
      const issues = computeHealth(index.skills, homedir());
      const map = new Map<string, HealthIssue[]>();
      for (const i of issues) {
        const arr = map.get(i.skillName) ?? [];
        arr.push(i);
        map.set(i.skillName, arr);
      }
      setIssuesByName(map);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const sections = new Map<string, DisplaySkill[]>();
  for (const s of items) {
    const t = sectionTitle(s);
    const arr = sections.get(t) ?? [];
    arr.push(s);
    sections.set(t, arr);
  }
  const orderedSections = [...sections.entries()].sort((a, b) =>
    a[0].startsWith("User")
      ? -1
      : b[0].startsWith("User")
        ? 1
        : a[0].localeCompare(b[0]),
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search skills by name, purpose, trigger…"
    >
      {orderedSections.map(([title, group]) => (
        <List.Section key={title} title={title}>
          {group.map((s) => {
            const issues = issuesByName.get(s.name) ?? [];
            return (
              <List.Item
                key={s.key}
                icon={iconFor(s)}
                title={s.name}
                subtitle={
                  showingDetail ? undefined : firstSentence(s.description)
                }
                keywords={s.keywords}
                accessories={accessoriesFor(s, issues)}
                detail={<SkillDetail skill={s} issues={issues} />}
                actions={
                  <ActionPanel>
                    <Action
                      title="Copy Skill Name"
                      icon={Icon.Clipboard}
                      onAction={() => copyToClipboard(s.name)}
                    />
                    <Action
                      title="Copy as /command"
                      icon={Icon.Terminal}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      onAction={() => copyToClipboard(slashCommand(s))}
                    />
                    <Action
                      title="Copy Trigger Phrase"
                      icon={Icon.Text}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                      onAction={() =>
                        copyToClipboard(s.primary.triggerHints[0] ?? s.name)
                      }
                    />
                    <Action
                      title="Toggle Detail"
                      icon={Icon.Sidebar}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => setShowingDetail((v) => !v)}
                    />
                    <Action
                      title="Open in Editor"
                      icon={Icon.Code}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                      onAction={() =>
                        openInEditor(join(s.primary.realPath, "SKILL.md"))
                      }
                    />
                    <Action.ShowInFinder
                      path={s.primary.realPath}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    />
                    {issues.length > 0 && (
                      <Action
                        title="Copy Fix Command"
                        icon={Icon.WrenchScrewdriver}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                        onAction={() =>
                          copyToClipboard(
                            buildFixCommand(issues[0]),
                            "Fix command copied",
                          )
                        }
                      />
                    )}
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={() => load(true)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
