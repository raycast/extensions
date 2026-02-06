import { ActionPanel, Detail, List, Action, Icon, Color, showToast, Toast, Alert, confirmAlert } from "@raycast/api";
import { useFetch, useCachedPromise } from "@raycast/utils";
import { exec } from "child_process";
import { readdir, stat, readFile, rm } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Skill {
  id: string;
  skillId: string;
  name: string;
  installs: number;
  source: string;
}

interface SearchResponse {
  skills: Skill[];
}

interface InstalledSkill {
  name: string;
  description: string;
  dirName: string;
  path: string;
  agents: string[];
  firstSeen: Date;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOME = homedir();

/** Map of agent display name → global skills directory path */
const AGENT_DIRS: Record<string, string> = {
  Cursor: join(HOME, ".cursor", "skills"),
  "Claude Code": join(HOME, ".claude", "skills"),
  Copilot: join(HOME, ".copilot", "skills"),
  Windsurf: join(HOME, ".codeium", "windsurf", "skills"),
  Goose: join(HOME, ".config", "goose", "skills"),
  Gemini: join(HOME, ".gemini", "skills"),
  Roo: join(HOME, ".roo", "skills"),
  Cline: join(HOME, ".cline", "skills"),
};

const GLOBAL_SKILLS_DIR = join(HOME, ".agents", "skills");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatInstalls(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return String(n);
}

function getInstallCommand(skill: Skill): string {
  return `npx skills add ${skill.source} --skill ${skill.name}`;
}

function runInTerminal(command: string): void {
  const escaped = command.replace(/"/g, '\\"');
  exec(`osascript -e 'tell application "Terminal" to do script "${escaped}"'`);
}

function getInstallColor(installs: number): Color {
  if (installs >= 10_000) return Color.Green;
  if (installs >= 1_000) return Color.Blue;
  return Color.SecondaryText;
}

/** Strip YAML frontmatter from markdown content */
function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const endIdx = content.indexOf("---", 3);
  if (endIdx === -1) return content;
  return content.slice(endIdx + 3).trim();
}

/** Parse name and description from YAML frontmatter */
function parseFrontmatter(content: string): { name?: string; description?: string } {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return {};
  const fm = fmMatch[1];
  const nameMatch = fm.match(/name:\s*(.+)/);
  const descMatch = fm.match(/description:\s*(.+)/);
  return {
    name: nameMatch?.[1]?.trim(),
    description: descMatch?.[1]?.trim(),
  };
}

/** Shorten a path by replacing the home dir with ~ */
function shortenPath(p: string): string {
  return p.replace(HOME, "~");
}

// ---------------------------------------------------------------------------
// Local Skill Discovery
// ---------------------------------------------------------------------------

/** Check if a directory exists */
async function dirExists(p: string): Promise<boolean> {
  try {
    const s = await stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

/** Check if a file exists */
async function fileExists(p: string): Promise<boolean> {
  try {
    const s = await stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

/** Scan ~/.agents/skills/ and return installed skills with metadata */
async function listGlobalSkills(): Promise<InstalledSkill[]> {
  if (!(await dirExists(GLOBAL_SKILLS_DIR))) return [];

  const entries = await readdir(GLOBAL_SKILLS_DIR, { withFileTypes: true });
  const skills: InstalledSkill[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillDir = join(GLOBAL_SKILLS_DIR, entry.name);
    const skillMdPath = join(skillDir, "SKILL.md");

    if (!(await fileExists(skillMdPath))) continue;

    // Read and parse SKILL.md
    const content = await readFile(skillMdPath, "utf-8");
    const { name, description } = parseFrontmatter(content);

    // Get birthtime (first seen)
    const dirStat = await stat(skillDir);
    const firstSeen = dirStat.birthtime;

    // Check which agents have this skill installed
    const agents: string[] = [];
    for (const [agentName, agentSkillsDir] of Object.entries(AGENT_DIRS)) {
      const agentSkillPath = join(agentSkillsDir, entry.name);
      if (await dirExists(agentSkillPath)) {
        agents.push(agentName);
      }
    }

    skills.push({
      name: name ?? entry.name,
      description: description ?? "",
      dirName: entry.name,
      path: skillDir,
      agents,
      firstSeen,
    });
  }

  // Sort by most recently added first
  skills.sort((a, b) => b.firstSeen.getTime() - a.firstSeen.getTime());

  return skills;
}

// ---------------------------------------------------------------------------
// Inline Detail Panel (zero extra fetch – uses only API data in memory)
// ---------------------------------------------------------------------------

function InlineDetail({ skill }: { skill: Skill }) {
  const installCommand = getInstallCommand(skill);

  const markdown = `# ${skill.name}

\`\`\`bash
${installCommand}
\`\`\`
`;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Installs" text={formatInstalls(skill.installs)} />
          <List.Item.Detail.Metadata.Link
            title="Repository"
            text={skill.source}
            target={`https://github.com/${skill.source}`}
          />
          <List.Item.Detail.Metadata.Link
            title="View on skills.sh"
            text={skill.name}
            target={`https://skills.sh/${skill.id}`}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Install Command" text={installCommand} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Search Result Actions (no pushed detail – Open on skills.sh is primary)
// ---------------------------------------------------------------------------

function SkillActions({
  skill,
  isShowingDetail,
  onToggleDetail,
}: {
  skill: Skill;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
}) {
  const installCommand = getInstallCommand(skill);

  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Install Command" content={installCommand} />
      <Action.OpenInBrowser
        title="Open on Skills.sh"
        url={`https://skills.sh/${skill.id}`}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
      <Action.OpenInBrowser
        title="Open Repository"
        url={`https://github.com/${skill.source}`}
        shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
      />
      <Action
        title="Send to Terminal"
        icon={Icon.Terminal}
        shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        onAction={() => runInTerminal(installCommand)}
      />
      <Action
        title={isShowingDetail ? "Hide Detail Panel" : "Show Detail Panel"}
        icon={Icon.Sidebar}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={onToggleDetail}
      />
    </ActionPanel>
  );
}

// ---------------------------------------------------------------------------
// Uninstall
// ---------------------------------------------------------------------------

async function uninstallSkill(skill: InstalledSkill, onUninstall: () => void) {
  const confirmed = await confirmAlert({
    title: `Uninstall "${skill.name}"?`,
    message: `This will remove the skill from ~/.agents/skills/ and all agent directories where it is installed.`,
    primaryAction: {
      title: "Uninstall",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) return;

  try {
    // Remove from global skills dir
    await rm(skill.path, { recursive: true, force: true });

    // Remove from each agent dir where installed
    for (const [, agentSkillsDir] of Object.entries(AGENT_DIRS)) {
      const agentSkillPath = join(agentSkillsDir, skill.dirName);
      if (await dirExists(agentSkillPath)) {
        await rm(agentSkillPath, { recursive: true, force: true });
      }
    }

    await showToast({ style: Toast.Style.Success, title: `Uninstalled "${skill.name}"` });
    onUninstall();
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to uninstall", message: String(error) });
  }
}

// ---------------------------------------------------------------------------
// Installed Skill Actions
// ---------------------------------------------------------------------------

function InstalledSkillActions({ skill, onUninstall }: { skill: InstalledSkill; onUninstall: () => void }) {
  return (
    <ActionPanel>
      <Action.Push
        title="View Details"
        icon={Icon.Eye}
        target={<InstalledSkillDetail skill={skill} onUninstall={onUninstall} />}
      />
      <Action.CopyToClipboard
        title="Copy Path"
        content={skill.path}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action.ShowInFinder
        title="Reveal in Finder"
        path={skill.path}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      />
      <Action.Open
        title="Open in Editor"
        target={join(skill.path, "SKILL.md")}
        shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
      />
      <Action
        title="Uninstall Skill"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        onAction={() => uninstallSkill(skill, onUninstall)}
      />
    </ActionPanel>
  );
}

// ---------------------------------------------------------------------------
// Installed Skill Detail View (reads local SKILL.md, no network fetch)
// ---------------------------------------------------------------------------

function InstalledSkillDetail({ skill, onUninstall }: { skill: InstalledSkill; onUninstall: () => void }) {
  const { data: markdownContent, isLoading } = useCachedPromise(
    async (path: string) => {
      const content = await readFile(path, "utf-8");
      const body = stripFrontmatter(content);
      const header = `# ${skill.name}`;
      const desc = skill.description ? `\n\n*${skill.description}*` : "";
      return `${header}${desc}\n\n---\n\n${body}`;
    },
    [join(skill.path, "SKILL.md")],
  );

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdownContent ?? `# ${skill.name}\n\n*Loading...*`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={skill.name} />
          <Detail.Metadata.Separator />
          {skill.agents.length > 0 ? (
            <Detail.Metadata.TagList title="Installed On">
              {skill.agents.map((agent) => (
                <Detail.Metadata.TagList.Item key={agent} text={agent} color={Color.Blue} />
              ))}
            </Detail.Metadata.TagList>
          ) : (
            <Detail.Metadata.Label title="Installed On" text="No agents detected" />
          )}
          <Detail.Metadata.Label title="Path" text={shortenPath(skill.path)} />
          <Detail.Metadata.Label
            title="First Seen"
            text={skill.firstSeen.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Path" content={skill.path} />
          <Action.ShowInFinder
            title="Reveal in Finder"
            path={skill.path}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          />
          <Action.Open
            title="Open in Editor"
            target={join(skill.path, "SKILL.md")}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
          <Action
            title="Uninstall Skill"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => uninstallSkill(skill, onUninstall)}
          />
        </ActionPanel>
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Main Command
// ---------------------------------------------------------------------------

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const toggleDetail = () => setIsShowingDetail((prev) => !prev);

  // Installed skills (loaded once on mount)
  const {
    data: installedSkills,
    isLoading: installedLoading,
    revalidate: revalidateInstalled,
  } = useCachedPromise(listGlobalSkills, [], {
    onError: (error) => {
      showToast({ style: Toast.Style.Failure, title: "Failed to load installed skills", message: String(error) });
    },
  });

  // Search results (throttled, keeps previous data to avoid flicker)
  const trimmedSearch = searchText.trim();
  const { data: searchData, isLoading: searchLoading } = useFetch<SearchResponse>(
    `https://skills.sh/api/search?q=${encodeURIComponent(trimmedSearch)}&limit=25`,
    {
      keepPreviousData: true,
      execute: trimmedSearch.length >= 2,
      onError: () => {
        // Silently ignore API errors (e.g. 400 Bad Request for short/invalid queries)
      },
    },
  );

  // Deduplicate by skill id (API may return duplicates) and sort by installs
  const skills = Array.from(
    (searchData?.skills ?? [])
      .reduce((map, skill) => {
        if (!map.has(skill.id)) map.set(skill.id, skill);
        return map;
      }, new Map<string, Skill>())
      .values(),
  ).sort((a, b) => b.installs - a.installs);
  const isSearching = trimmedSearch.length > 0;
  const installed = installedSkills ?? [];

  return (
    <List
      isLoading={isSearching ? searchLoading : installedLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      throttle
      searchBarPlaceholder="Search agent skills…"
      isShowingDetail={isSearching && skills.length > 0 && isShowingDetail}
    >
      {isSearching ? (
        // ── Search results ──
        skills.length === 0 ? (
          <List.EmptyView icon={Icon.MagnifyingGlass} title="No Results" description="Try a different search query" />
        ) : (
          skills.map((skill) => (
            <List.Item
              key={skill.id}
              icon={Icon.Book}
              title={skill.name}
              subtitle={isShowingDetail ? undefined : skill.source}
              accessories={
                isShowingDetail
                  ? [{ tag: { value: formatInstalls(skill.installs), color: getInstallColor(skill.installs) } }]
                  : [
                      { tag: { value: formatInstalls(skill.installs), color: getInstallColor(skill.installs) } },
                      { text: skill.source },
                    ]
              }
              detail={<InlineDetail skill={skill} />}
              actions={<SkillActions skill={skill} isShowingDetail={isShowingDetail} onToggleDetail={toggleDetail} />}
            />
          ))
        )
      ) : // ── Installed skills ──
      installed.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search for Agent Skills"
          description="Type a query to search skills.sh"
        />
      ) : (
        <List.Section title="Installed Skills" subtitle={`${installed.length} skills`}>
          {installed.map((skill) => (
            <List.Item
              key={skill.dirName}
              icon={Icon.CheckCircle}
              title={skill.name}
              subtitle={shortenPath(skill.path)}
              accessories={[
                ...skill.agents.map((agent) => ({
                  tag: { value: agent, color: Color.Blue },
                })),
                { date: skill.firstSeen, tooltip: `First seen: ${skill.firstSeen.toLocaleDateString()}` },
              ]}
              actions={<InstalledSkillActions skill={skill} onUninstall={revalidateInstalled} />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
