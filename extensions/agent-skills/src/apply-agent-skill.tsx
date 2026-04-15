import { Action, ActionPanel, AI, Clipboard, Detail, Icon, List, Toast, environment, open, showToast, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import fs from "node:fs/promises";
import path from "node:path";

const SKILLS_ROOT = path.join(process.env.HOME ?? "", ".agents", "skills");

type Skill = {
  id: string;
  title: string;
  description: string;
  model?: AI.Model;
  folderName: string;
  filePath: string;
  instructions: string;
  keywords: string[];
};

type Frontmatter = {
  name?: string;
  description?: string;
  model?: string;
};

function normalizeFrontmatterValue(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function parseModel(value?: string): AI.Model | undefined {
  if (!value) {
    return undefined;
  }

  const normalizedValue = normalizeFrontmatterValue(value);
  const modelKey = normalizedValue as keyof typeof AI.Model;
  if (modelKey in AI.Model) {
    return AI.Model[modelKey];
  }

  const matchingModel = Object.values(AI.Model).find((model) => model === normalizedValue);
  return matchingModel;
}

function parseFrontmatter(markdown: string): { frontmatter: Frontmatter; body: string } {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: markdown };
  }

  const [, rawFrontmatter, body] = match;
  const frontmatter: Frontmatter = {};

  for (const line of rawFrontmatter.split("\n")) {
    const keyValueMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyValueMatch) {
      continue;
    }

    const [, key, value] = keyValueMatch;
    if (key === "name" || key === "description" || key === "model") {
      frontmatter[key] = normalizeFrontmatterValue(value);
    }
  }

  return { frontmatter, body };
}

async function findSkillFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const skillFiles: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (!entry.isDirectory()) {
      continue;
    }

    const skillFilePath = path.join(entryPath, "SKILL.md");
    try {
      await fs.access(skillFilePath);
      skillFiles.push(skillFilePath);
      continue;
    } catch {}

    skillFiles.push(...(await findSkillFiles(entryPath)));
  }

  return skillFiles;
}

async function loadSkills(): Promise<Skill[]> {
  const skillFiles = await findSkillFiles(SKILLS_ROOT);
  const loadedSkills = await Promise.all(
    skillFiles.map(async (filePath) => {
      const markdown = await fs.readFile(filePath, "utf8");
      const { frontmatter, body } = parseFrontmatter(markdown);
      const folderName = path.basename(path.dirname(filePath));
      const title = frontmatter.name?.trim() || folderName;
      const description = frontmatter.description?.trim() || "No description";
      const model = parseModel(frontmatter.model);
      const keywords = Array.from(new Set([title, folderName, description].join(" ").toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean)));

      return {
        id: filePath,
        title,
        description,
        model,
        folderName,
        filePath,
        instructions: body.trim(),
        keywords,
      } satisfies Skill;
    }),
  );

  return loadedSkills.sort((a, b) => {
    const titleComparison = a.title.localeCompare(b.title);
    return titleComparison !== 0 ? titleComparison : a.folderName.localeCompare(b.folderName);
  });
}

function injectInput(instructions: string, input: string) {
  if (instructions.match(/INPUT:\s*$/)) {
    return instructions.replace(/INPUT:\s*$/, `INPUT:\n${input}`);
  }

  return `${instructions}\n\n# INPUT:\n\n${input}`;
}

function buildSkillPreview(skill: Skill) {

  return [
    `# ${skill.title}`,
    "",
    skill.description || "_No description provided._",
  ].join("\n");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function ResultView(props: { skill: Skill; input: string; result: string }) {
  const { skill, input, result } = props;

  return (
    <Detail
      navigationTitle={skill.title}
      markdown={result}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Skill" text={skill.title} />
          <Detail.Metadata.Label title="Folder" text={skill.folderName} />
          <Detail.Metadata.Label title="Input Length" text={`${input.length} chars`} />
          <Detail.Metadata.Label title="Output Length" text={`${result.length} chars`} />
          <Detail.Metadata.Link title="Skill File" target={skill.filePath} text={skill.filePath} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={result} />
          <Action.Paste title="Paste Result" content={result} />
          <Action.CopyToClipboard title="Copy Original Input" content={input} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <Action title="Open Skill File" onAction={() => open(skill.filePath)} shortcut={{ modifiers: ["cmd"], key: "o" }} />
        </ActionPanel>
      }
    />
  );
}

export default function ApplyAgentSkill() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [clipboardText, setClipboardText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const { push } = useNavigation();

  async function refresh() {
    setIsLoading(true);
    setLoadError(undefined);

    try {
      const [loadedSkills, clipboard] = await Promise.all([loadSkills(), Clipboard.readText()]);
      setSkills(loadedSkills);
      setClipboardText(clipboard ?? "");
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const emptyTitle = useMemo(() => {
    if (loadError) {
      return "Couldn’t load skills";
    }

    if (skills.length === 0) {
      return "No skills found";
    }

    return "No matching skills";
  }, [loadError, skills.length]);

  const emptyDescription = useMemo(() => {
    if (loadError) {
      return loadError;
    }

    if (skills.length === 0) {
      return `Expected skills under ${SKILLS_ROOT}`;
    }

    return "Try a different search term.";
  }, [loadError, skills.length]);

  async function runSkill(skill: Skill) {
    const input = clipboardText.trim();
    if (!input) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard is empty",
        message: "Copy some text, then run the command again.",
      });
      return;
    }

    if (!environment.canAccess(AI)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Raycast AI access required",
        message: "Enable Raycast AI for this extension, then try again.",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Running ${skill.title}…`,
    });

    try {
      const result = await AI.ask(injectInput(skill.instructions, input), {
        creativity: "low",
        model: skill.model,
      });

      await Clipboard.copy(result);
      toast.style = Toast.Style.Success;
      toast.title = `${skill.title} complete`;
      toast.message = "Result copied to clipboard";
      push(<ResultView skill={skill} input={input} result={result} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to run ${skill.title}`;
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Apply Agent Skill" searchBarPlaceholder="Search skills..." isShowingDetail>
      <List.EmptyView
        title={emptyTitle}
        description={emptyDescription}
        actions={
          <ActionPanel>
            <Action title="Reload" icon={Icon.ArrowClockwise} onAction={refresh} />
            <Action title="Open Skills Folder" onAction={() => open(SKILLS_ROOT)} />
          </ActionPanel>
        }
      />

      {skills.map((skill) => (
        <List.Item
          key={skill.id}
          title={skill.title}
          keywords={skill.keywords}
          icon={Icon.Wand}
          detail={<List.Item.Detail markdown={buildSkillPreview(skill)} />}
          actions={
            <ActionPanel>
              <Action title="Run Skill" icon={Icon.Play} onAction={() => runSkill(skill)} />
              <Action title="Reload Skills" icon={Icon.ArrowClockwise} onAction={refresh} shortcut={{ modifiers: ["cmd"], key: "r" }} />
              <Action.CopyToClipboard title="Copy Skill File Path" content={skill.filePath} />
              <Action title="Open Skill File" onAction={() => open(skill.filePath)} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
