import { Action, ActionPanel, Clipboard, Color, Detail, Icon, List, Toast, open, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { isReadOnly } from "./lib/readonly";
import { ResolvedSkill, SkillSource, listAvailableSkills, refreshAll } from "./lib/skill-source";

const REPO_URL = "https://github.com/superhuman/mcp-mail/tree/main/skills";
const AI_CHAT_DEEPLINK = "raycast://extensions/raycast/raycast-ai/ai-chat";

export default function Command() {
  const [skills, setSkills] = useState<ResolvedSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const readOnly = useMemo(() => isReadOnly(), []);

  async function load(force = false) {
    setLoading(true);
    try {
      const out = await listAvailableSkills({ forceRefresh: force });
      setSkills(out);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Render bundled/cached immediately, then refresh from upstream in the
    // background. Both stages call setSkills.
    load(false);
  }, []);

  async function onRefreshAll() {
    setRefreshing(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing skills…" });
    try {
      const { updated, failed } = await refreshAll();
      await load(false);
      toast.style = failed.length ? Toast.Style.Failure : Toast.Style.Success;
      toast.title = failed.length
        ? `Refreshed ${updated.length}, ${failed.length} failed`
        : `Refreshed ${updated.length} skills`;
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <List isLoading={loading || refreshing} searchBarPlaceholder="Filter Superhuman skills…">
      {skills.map((r) => (
        <SkillRow key={r.skill.frontmatter.name} resolved={r} readOnly={readOnly} onRefreshAll={onRefreshAll} />
      ))}
      {!loading && skills.length === 0 ? (
        <List.EmptyView
          icon={Icon.WrenchScrewdriver}
          title="No skills available"
          description="Bundled fallback failed to load. Try Refresh from Upstream."
        />
      ) : null}
    </List>
  );
}

function SkillRow({
  resolved,
  readOnly,
  onRefreshAll,
}: {
  resolved: ResolvedSkill;
  readOnly: boolean;
  onRefreshAll: () => void;
}) {
  const { skill, source, fetchedAt } = resolved;
  const { frontmatter, body } = skill;
  const prompt = body.trim();
  const blocked = !frontmatter.read_only && readOnly;
  const accessories: List.Item.Accessory[] = [
    { tag: { value: source, color: SOURCE_COLOR[source] }, tooltip: sourceTooltip(source, fetchedAt) },
    frontmatter.read_only
      ? { icon: { source: Icon.Eye, tintColor: Color.Green }, tooltip: "Read-only skill" }
      : {
          icon: { source: Icon.Pencil, tintColor: blocked ? Color.Red : Color.Orange },
          tooltip: blocked ? "Writes — blocked by Read-only mode" : "Writes to account",
        },
  ];

  const markdown = `# ${titleCase(frontmatter.name)}\n\n> ${frontmatter.description}\n\n${blocked ? blockedBanner() : ""}\n${body.trim()}`;

  return (
    <List.Item
      title={titleCase(frontmatter.name)}
      subtitle={frontmatter.description}
      accessories={accessories}
      icon={blocked ? { source: Icon.Lock, tintColor: Color.Red } : Icon.Wand}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Slug" text={frontmatter.name} />
              <List.Item.Detail.Metadata.Label
                title="Mode"
                text={frontmatter.read_only ? "read-only" : "writes to account"}
                icon={frontmatter.read_only ? Icon.Eye : Icon.Pencil}
              />
              <List.Item.Detail.Metadata.TagList title="Tools used">
                {frontmatter.tools_used.map((t) => (
                  <List.Item.Detail.Metadata.TagList.Item key={t} text={t} />
                ))}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Source" text={sourceTooltip(source, fetchedAt)} />
              {frontmatter.upstream ? (
                <List.Item.Detail.Metadata.Link
                  title="Upstream"
                  target={frontmatter.upstream}
                  text="superhuman/mcp-mail"
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Run with Raycast AI"
              icon={Icon.Wand}
              onAction={async () => {
                await Clipboard.copy(`@superhuman ${prompt}`);
                await open(AI_CHAT_DEEPLINK);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Prompt copied",
                  message: "Paste into AI Chat to run the skill.",
                });
              }}
            />
            <Action.CopyToClipboard title="Copy Prompt" content={prompt} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {frontmatter.upstream ? (
              <Action.OpenInBrowser
                title="View Source on GitHub"
                url={frontmatter.upstream}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            ) : null}
            <Action.Push
              title="View Tools Used"
              icon={Icon.WrenchScrewdriver}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              target={<ToolsDetail tools={frontmatter.tools_used} skillName={titleCase(frontmatter.name)} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh from Upstream"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefreshAll}
            />
            <Action.OpenInBrowser
              title="Open Skills Repo"
              url={REPO_URL}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ToolsDetail({ tools, skillName }: { tools: string[]; skillName: string }) {
  const md = [
    `# Tools used by ${skillName}`,
    "",
    "MCP tool names the skill expects to chain. Each is exposed under the same name on `@superhuman` in Raycast AI.",
    "",
    ...tools.map((t) => `- \`${t}\``),
  ].join("\n");
  return (
    <Detail
      markdown={md}
      navigationTitle={`${skillName} — Tools`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Tool List" content={tools.join(", ")} />
        </ActionPanel>
      }
    />
  );
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function blockedBanner(): string {
  return [
    "",
    "> ⚠️ **Read-only mode is on.** This skill writes to your account; it will be refused on attempted writes.",
    "> Disable *Read-only mode* in the Superhuman extension preferences to run it.",
    "",
  ].join("\n");
}

const SOURCE_COLOR: Record<SkillSource, Color> = {
  bundled: Color.SecondaryText,
  cached: Color.Blue,
  live: Color.Green,
};

function sourceTooltip(source: SkillSource, fetchedAt: number): string {
  if (source === "bundled") return "Bundled with the extension";
  if (!fetchedAt) return source;
  const ago = formatAgo(Date.now() - fetchedAt);
  return source === "live" ? `Just fetched (${ago} ago)` : `Cached • updated ${ago} ago`;
}

function formatAgo(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.round(hr / 24);
  return `${d}d`;
}
