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

type ResultViewProps = {
  title: string;
  input: string;
  result: string;
  prompt?: string;
  subtitle?: string;
  filePath?: string;
};

type RunState = {
  title: string;
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
  const outputRequirements = [
    "# FINAL OUTPUT REQUIREMENTS:",
    "",
    "- Return only the final transformed text.",
    "- Do not include headings, labels, or preamble text.",
    "- Do not write things like `# OUTPUT`, `Output:`, or explanatory notes.",
  ].join("\n");

  if (instructions.match(/INPUT:\s*$/)) {
    return `${instructions.replace(/INPUT:\s*$/, `INPUT:\n${input}`)}\n\n${outputRequirements}`;
  }

  return `${instructions}\n\n# INPUT:\n\n${input}\n\n${outputRequirements}`;
}

function buildFreeFormPrompt(request: string, input: string) {
  const instructions = [
    "You must apply the user's request to the text in INPUT.",
    "Do not answer the request abstractly.",
    "Do not describe what you would change.",
    "Return only a rewritten or transformed version of INPUT.",
    "If the request is ambiguous, make the smallest reasonable transformation that satisfies it.",
    "",
    "# USER REQUEST:",
    request.trim(),
    "",
    "Treat INPUT as the source text to edit.",
  ].join("\n");

  return injectInput(instructions, input);
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

function ResultView(props: ResultViewProps) {
  const { filePath, input, prompt, result, title } = props;

  return (
    <Detail
      navigationTitle={title}
      markdown={result}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={result} />
          <Action.Paste title="Paste Result" content={result} />
          <Action.CopyToClipboard title="Copy Original Input" content={input} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          {prompt ? <Action.CopyToClipboard title="Copy Prompt" content={prompt} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} /> : null}
          {filePath ? <Action title="Open Skill File" onAction={() => open(filePath)} shortcut={{ modifiers: ["cmd"], key: "o" }} /> : null}
        </ActionPanel>
      }
    />
  );
}

function ProgressView(props: { runState: RunState }) {
  const { runState } = props;

  return (
    <Detail
      isLoading
      navigationTitle={runState.title}
      markdown={`# ${runState.title}`}
    />
  );
}

export default function ApplyAgentSkill() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [clipboardText, setClipboardText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [runState, setRunState] = useState<RunState>();
  const [searchText, setSearchText] = useState("");
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

    if (searchText.trim()) {
      return "Press Enter to run the current search as a free-form prompt on your clipboard text.";
    }

    if (skills.length === 0) {
      return `Expected skills under ${SKILLS_ROOT}`;
    }

    return "Try a different search term.";
  }, [loadError, searchText, skills.length]);

  async function runPrompt(prompt: string) {
    const input = clipboardText.trim();
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Prompt is empty",
        message: "Type a prompt to run against your clipboard text.",
      });
      return;
    }

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

    setRunState({
      title: "Running Free-Form Prompt",
    });

    try {
      const result = await AI.ask(buildFreeFormPrompt(trimmedPrompt, input), {
        creativity: "low",
      });

      push(<ResultView title="Free-Form Prompt" prompt={trimmedPrompt} input={input} result={result} />);
      await showToast({
        style: Toast.Style.Success,
        title: "Free-form prompt complete",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to run free-form prompt",
        message: getErrorMessage(error),
      });
    } finally {
      setRunState(undefined);
    }
  }

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

    setRunState({
      title: `Running ${skill.title}`,
    });

    try {
      const result = await AI.ask(injectInput(skill.instructions, input), {
        creativity: "low",
        model: skill.model,
      });

      push(
        <ResultView
          title={skill.title}
          subtitle={skill.folderName}
          filePath={skill.filePath}
          input={input}
          result={result}
        />,
      );
      await showToast({
        style: Toast.Style.Success,
        title: `${skill.title} complete`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to run ${skill.title}`,
        message: getErrorMessage(error),
      });
    } finally {
      setRunState(undefined);
    }
  }

  if (runState) {
    return <ProgressView runState={runState} />;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Apply Agent Skill"
      searchBarPlaceholder="Search skills or type a free-form prompt..."
      filtering={true}
      onSearchTextChange={setSearchText}
      isShowingDetail
    >
      <List.EmptyView
        title={emptyTitle}
        description={emptyDescription}
        actions={
          <ActionPanel>
            {searchText.trim() && !loadError ? <Action title="Run Free-Form Prompt" icon={Icon.Text} onAction={() => runPrompt(searchText)} /> : null}
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
