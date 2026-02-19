import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export type Skill = {
  name: string;
  dir: string;
  summary?: string;
};

export const SKILL_FILE = "SKILL.md";

function listSkillFiles(skillDir: string, maxFiles = 100) {
  const files: string[] = [];
  if (!fs.existsSync(skillDir) || !fs.statSync(skillDir).isDirectory()) return files;

  function walk(dir: string, relBase: string) {
    if (files.length >= maxFiles) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = path.join(relBase, entry.name);
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), relPath);
      } else if (entry.isFile() && entry.name !== SKILL_FILE) {
        files.push(relPath);
      }
      if (files.length >= maxFiles) return;
    }
  }
  walk(skillDir, "");
  return files;
}

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };
  const [, fm, body] = match;
  const frontmatter = Object.fromEntries(
    fm
      .split("\n")
      .map((line) => {
        const i = line.indexOf(":");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      })
      .filter(([k, v]) => k && v),
  ) as Record<string, string>;
  return { frontmatter, body: body.trim() };
}

function extractSummary(content: string) {
  const match = content.match(/^description:\s*(.+)$/m);
  if (match) return match[1].trim();
  const firstH1 = content.match(/^#\s+(.+)$/m);
  if (firstH1) return firstH1[1].trim();
  const firstLine = content.split("\n").find((l) => l.trim().length > 0);
  return firstLine?.trim().slice(0, 120);
}

export async function listSkills(rootPath: string) {
  const root = resolveSkillsRoot(rootPath);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const results = await Promise.all(
    entries
      .filter((e) => e.isDirectory())
      .map(async (entry) => {
        const dirPath = path.join(root, entry.name);
        const filePath = path.join(dirPath, SKILL_FILE);
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
        let summary: string | undefined;
        try {
          summary = extractSummary(await fs.promises.readFile(filePath, "utf-8"));
        } catch {
          // ignore
        }
        const skill: Skill = { name: entry.name, dir: dirPath };
        if (summary) skill.summary = summary;
        return skill;
      }),
  );
  const skills = results.filter((s): s is Skill => s !== null);
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

function findSkillDir(root: string, name: string) {
  const nameLower = name.trim().toLowerCase();
  const dirs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(root, e.name, SKILL_FILE)))
    .map((e) => e.name);

  const exact = dirs.find((n) => n.toLowerCase() === nameLower);
  if (exact) return path.join(root, exact);

  const fuzzy = dirs.filter((n) => n.toLowerCase().includes(nameLower));
  if (fuzzy.length === 0) throw new Error(`No skill found matching "${name}". Available: ${dirs.join(", ")}`);
  if (fuzzy.length > 1) throw new Error(`Multiple skills match "${name}": ${fuzzy.join(", ")}. Be more specific.`);
  return path.join(root, fuzzy[0]);
}

export function readSkill(rootPath: string, name: string, maxChars = 100_000) {
  const root = resolveSkillsRoot(rootPath);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Skills directory not found: ${rootPath}`);
  }
  const skillDir = findSkillDir(root, name);
  const skill: Skill = { name: path.basename(skillDir), dir: skillDir };
  const filePath = path.join(skillDir, SKILL_FILE);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`Skill file not found: ${skill.dir}`);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const { frontmatter, body } = parseFrontmatter(raw);
  const truncated = body.length > maxChars;
  const content = truncated ? body.slice(0, maxChars) + "\n\n[... Truncated. Increase maxChars to see more ...]" : body;
  const files = listSkillFiles(skillDir);
  return { content, metadata: frontmatter, skill, files };
}

export function readSkillFile(rootPath: string, skillName: string, filePath: string, maxChars = 100_000) {
  const root = resolveSkillsRoot(rootPath);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Skills directory not found: ${rootPath}`);
  }
  const skillDir = path.join(root, skillName);
  if (!isWithinRoot(skillDir, root)) {
    throw new Error("Invalid skill path: outside skills directory");
  }
  const resolved = path.resolve(skillDir, filePath);
  if (!isWithinRoot(resolved, skillDir)) {
    throw new Error(`Invalid file path: outside skill directory`);
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error(`File not found: ${filePath}`);
  }
  const raw = fs.readFileSync(resolved, "utf-8");
  return raw.length > maxChars
    ? raw.slice(0, maxChars) + "\n\n[... Truncated. Increase maxChars to see more ...]"
    : raw;
}

function expandHomeDir(p: string) {
  if (p.startsWith("~")) return path.normalize(p.replace(/^~/, os.homedir()));
  return p;
}

function resolveSkillsRoot(rawPath: string) {
  if (!rawPath?.trim()) throw new Error("Skills directory path is required");
  return path.resolve(expandHomeDir(rawPath.trim()));
}

function isWithinRoot(child: string, root: string) {
  const c = path.resolve(child);
  const r = path.resolve(root);
  return c === r || c.startsWith(r + path.sep);
}
