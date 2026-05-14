import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";

export const DATA_DIR = path.join(environment.supportPath, "agency-agents");
export const AGENTS_DIR = DATA_DIR;
const AGENCY_README = path.join(DATA_DIR, "README.md");

export type Agent = {
  slug: string;
  name: string;
  division: string;
  subgroup?: string;
  file: string;
  specialty: string;
  when: string;
  content: string;
  emoji?: string;
  description?: string;
  vibe?: string;
  divisionDescription?: string;
  rosterSpecialty?: string;
  rosterWhen?: string;
  rosterEmoji?: string;
  divisionEmoji?: string;
};

type Frontmatter = {
  name?: string;
  emoji?: string;
  description?: string;
  vibe?: string;
};

const acronymLabels: Record<string, string> = {
  ai: "AI",
  api: "API",
  aso: "ASO",
  cli: "CLI",
  devops: "DevOps",
  ios: "iOS",
  legal: "Legal",
  lsp: "LSP",
  macos: "macOS",
  tiktok: "TikTok",
  twitter: "Twitter",
  ui: "UI",
  ux: "UX",
  visionos: "visionOS",
  webxr: "WebXR",
  xr: "XR",
};

export const allowedDivisions = [
  "engineering",
  "design",
  "paid-media",
  "marketing",
  "product",
  "project-management",
  "testing",
  "support",
  "spatial-computing",
  "specialized",
  "game-development",
] as const;

const gameDevelopmentSubgroupLabels: Record<string, string> = {
  "cross-engine-agents": "Cross-Engine Agents (Engine-Agnostic)",
  unity: "Unity",
  "unreal-engine": "Unreal Engine",
  godot: "Godot",
  "roblox-studio": "Roblox Studio",
};

function parseFrontmatter(content: string): Frontmatter {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return {};

  return match[1].split("\n").reduce<Frontmatter>((acc, line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) return acc;

    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (key === "name" && value) {
      acc.name = value;
    }

    if (key === "emoji" && value) {
      acc.emoji = value;
    }

    if (key === "description" && value) {
      acc.description = value;
    }

    if (key === "vibe" && value) {
      acc.vibe = value;
    }

    return acc;
  }, {});
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n?/m, "").trim();
}

function extractSection(content: string, heading: string): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^##+\\s+${escapedHeading}\\s*$\\n([\\s\\S]*?)(?=^##+\\s+|$)`, "im");
  const match = content.match(regex);

  if (!match) return "";

  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/^\*\*|\*\*$/g, "")
    .trim();
}

function formatSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => acronymLabels[part] ?? `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getAgentSlug(division: string, file: string): string {
  const baseName = file.replace(/\.md$/i, "");
  const prefix = `${division}-`;

  return baseName.startsWith(prefix) ? baseName.slice(prefix.length) : baseName;
}

type RosterEntry = {
  divisionDescription: string;
  specialty: string;
  when: string;
  emoji?: string;
  divisionEmoji?: string;
};

function normalizeAgentKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/^[^\w]+/u, "")
    .replace(/\.(md)$/i, "")
    .trim();
}

function getLeadingEmoji(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const match = trimmed.match(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|[\u2600-\u27BF])/u);
  return match?.[0];
}

function parseRosterFromReadme(): Map<string, RosterEntry> {
  const entries = new Map<string, RosterEntry>();

  if (!fs.existsSync(AGENCY_README)) return entries;

  const content = fs.readFileSync(AGENCY_README, "utf8");
  const lines = content.split("\n");
  let currentDivisionDescription = "";
  let currentDivisionEmoji: string | undefined;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (line.startsWith("### ")) {
      currentDivisionEmoji = getLeadingEmoji(line.replace(/^###\s+/, ""));
      currentDivisionDescription = lines[index + 1]?.trim() ?? "";
      continue;
    }

    if (!line.startsWith("|") || !line.includes("](")) continue;
    if (line.includes("| Agent | Specialty | When to Use |") || line.includes("| --- | --- | --- |")) continue;
    if (line.includes("|-------|")) continue;

    const columns = line
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);

    if (columns.length < 3) continue;

    const agentColumn = columns[0];
    const match = agentColumn.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (!match) continue;

    const agentName = match[1].trim();
    const agentPath = match[2].trim();
    const basename = path.basename(agentPath, ".md");

    const entry: RosterEntry = {
      divisionDescription: currentDivisionDescription,
      specialty: columns[1],
      when: columns[2],
      emoji: getLeadingEmoji(agentColumn),
      divisionEmoji: currentDivisionEmoji,
    };

    entries.set(normalizeAgentKey(agentName), entry);
    entries.set(normalizeAgentKey(basename), entry);
  }

  return entries;
}

export function getDivisionLabel(division: string): string {
  return formatSlug(division);
}

export function getGameDevelopmentSubgroupLabel(subgroup: string): string {
  return gameDevelopmentSubgroupLabels[subgroup] ?? formatSlug(subgroup);
}

function buildAgent(opts: {
  slug: string;
  name: string;
  division: string;
  file: string;
  content: string;
  frontmatter: Frontmatter;
  rosterEntry?: RosterEntry | undefined;
  subgroup?: string | undefined;
}): Agent {
  return {
    slug: opts.slug,
    name: opts.name,
    division: opts.division,
    ...(opts.subgroup ? { subgroup: opts.subgroup } : {}),
    file: opts.file,
    specialty: extractSection(opts.content, "Specialty"),
    when: extractSection(opts.content, "When to Use"),
    content: opts.content,
    emoji: opts.frontmatter.emoji,
    description: opts.frontmatter.description,
    vibe: opts.frontmatter.vibe,
    divisionDescription: opts.rosterEntry?.divisionDescription,
    rosterSpecialty: opts.rosterEntry?.specialty,
    rosterWhen: opts.rosterEntry?.when,
    rosterEmoji: opts.rosterEntry?.emoji,
    divisionEmoji: opts.rosterEntry?.divisionEmoji,
  };
}

export function loadAgents(): Agent[] {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  const rosterEntries = parseRosterFromReadme();

  const divisions = fs
    .readdirSync(AGENTS_DIR)
    .filter((division): division is (typeof allowedDivisions)[number] =>
      (allowedDivisions as readonly string[]).includes(division),
    )
    .sort();
  const agents: Agent[] = [];

  for (const division of divisions) {
    const directory = path.join(AGENTS_DIR, division);

    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) continue;

    if (division === "game-development") {
      const rootFiles = fs
        .readdirSync(directory)
        .filter((file) => file.endsWith(".md"))
        .sort();

      for (const file of rootFiles) {
        const fullPath = path.join(directory, file);
        const rawContent = fs.readFileSync(fullPath, "utf8");
        const content = stripFrontmatter(rawContent);
        const frontmatter = parseFrontmatter(rawContent);
        const slug = getAgentSlug(division, file);
        const rosterEntry =
          rosterEntries.get(normalizeAgentKey(frontmatter.name ?? formatSlug(slug))) ??
          rosterEntries.get(normalizeAgentKey(file));
        agents.push(
          buildAgent({
            slug,
            name: frontmatter.name ?? formatSlug(slug),
            division,
            file: fullPath,
            content,
            frontmatter,
            rosterEntry,
          }),
        );
      }

      const subgroups = fs
        .readdirSync(directory)
        .filter((entry) => {
          const subgroupPath = path.join(directory, entry);
          if (!fs.existsSync(subgroupPath) || !fs.statSync(subgroupPath).isDirectory()) return false;

          return fs.readdirSync(subgroupPath).some((file) => file.endsWith(".md"));
        })
        .sort();

      for (const subgroup of subgroups) {
        const subgroupDirectory = path.join(directory, subgroup);
        const files = fs
          .readdirSync(subgroupDirectory)
          .filter((file) => file.endsWith(".md"))
          .sort();

        for (const file of files) {
          const fullPath = path.join(subgroupDirectory, file);
          const rawContent = fs.readFileSync(fullPath, "utf8");
          const content = stripFrontmatter(rawContent);
          const frontmatter = parseFrontmatter(rawContent);
          const slug = getAgentSlug(subgroup, file);
          const rosterEntry =
            rosterEntries.get(normalizeAgentKey(frontmatter.name ?? formatSlug(slug))) ??
            rosterEntries.get(normalizeAgentKey(file));
          agents.push(
            buildAgent({
              slug,
              name: frontmatter.name ?? formatSlug(slug),
              division,
              subgroup,
              file: fullPath,
              content,
              frontmatter,
              rosterEntry,
            }),
          );
        }
      }

      continue;
    }

    const files = fs
      .readdirSync(directory)
      .filter((file) => file.endsWith(".md"))
      .sort();

    for (const file of files) {
      const fullPath = path.join(directory, file);
      const rawContent = fs.readFileSync(fullPath, "utf8");
      const content = stripFrontmatter(rawContent);
      const frontmatter = parseFrontmatter(rawContent);
      const slug = getAgentSlug(division, file);
      const rosterEntry =
        rosterEntries.get(normalizeAgentKey(frontmatter.name ?? formatSlug(slug))) ??
        rosterEntries.get(normalizeAgentKey(file));
      agents.push(
        buildAgent({
          slug,
          name: frontmatter.name ?? formatSlug(slug),
          division,
          file: fullPath,
          content,
          frontmatter,
          rosterEntry,
        }),
      );
    }
  }

  return agents;
}
