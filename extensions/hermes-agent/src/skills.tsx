import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getConfig } from "./api";
import { listSkills, SkillSummary } from "./hermes-client";

const CATEGORY_ICON: Record<string, Icon> = {
  creative: Icon.Brush,
  development: Icon.Code,
  research: Icon.MagnifyingGlass,
  productivity: Icon.Document,
  devops: Icon.Gear,
  mlops: Icon.ComputerChip,
  apple: Icon.ComputerChip,
  github: Icon.Code,
  cloudflare: Icon.Cloud,
  crypto: Icon.Key,
  media: Icon.Music,
  social: Icon.Message,
  gaming: Icon.GameController,
  security: Icon.Lock,
  data: Icon.BarChart,
  note: Icon.Text,
  email: Icon.Envelope,
  leisure: Icon.Map,
  sandbox: Icon.Box,
  turnstile: Icon.Shield,
  workers: Icon.Cloud,
  durable: Icon.Box,
  web: Icon.Globe,
  make: Icon.Wand,
  discord: Icon.Message,
  session: Icon.Clock,
  dogfood: Icon.Bug,
  red: Icon.ExclamationMark,
  baoyu: Icon.Brush,
  ascii: Icon.Text,
  autonomous: Icon.Bolt,
  computer: Icon.Desktop,
  jdj: Icon.Globe,
  krea: Icon.Brush,
};

function iconForCategory(category: string | null): Icon {
  if (!category) return Icon.Book;
  const lower = category.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICON)) {
    if (lower.includes(key)) return icon;
  }
  return Icon.Book;
}

export default function Command() {
  const config = useMemo(() => getConfig(), []);
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setSkills(await listSkills(config));
    } catch {
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const filtered = useMemo(() => {
    if (!search.trim()) return skills;
    const q = search.toLowerCase();
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.category ?? "").toLowerCase().includes(q),
    );
  }, [skills, search]);

  const categories = useMemo(() => {
    const map = new Map<string, SkillSummary[]>();
    for (const skill of filtered) {
      const cat = skill.category || "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(skill);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchBarPlaceholder="Search skills by name, description, or category…"
      searchText={search}
      onSearchTextChange={setSearch}
    >
      {categories.map(([category, items]) => (
        <List.Section key={category} title={category}>
          {items.map((skill) => (
            <List.Item
              key={skill.name}
              icon={iconForCategory(skill.category)}
              title={skill.name}
              subtitle={skill.description.slice(0, 80)}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Skill Name"
                    content={skill.name}
                  />
                  <Action.CopyToClipboard
                    title="Copy for /Skill Command"
                    content={`/skill ${skill.name}`}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      <List.EmptyView
        icon={Icon.Book}
        title={isLoading ? "Loading skills…" : "No skills found"}
      />
    </List>
  );
}
