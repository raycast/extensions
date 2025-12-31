import { Form, ActionPanel, Action, showToast, Toast, closeMainWindow, open, getPreferenceValues } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";

interface DailyNotesConfig {
  folder?: string;
  format?: string;
}

const DAILY_NOTES_CONFIG_FILE = ".obsidian/daily-notes.json";

interface FormValues {
  content: string;
}

function readDailyNotesConfig(vaultRoot: string): DailyNotesConfig | null {
  const fullPath = path.join(vaultRoot, DAILY_NOTES_CONFIG_FILE);
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(fullPath, "utf8");
    return JSON.parse(raw) as DailyNotesConfig;
  } catch (error) {
    console.error("Failed to read daily-notes.json", error);
    return null;
  }
}

function formatDatePattern(pattern: string, date: Date): string {
  const year = String(date.getFullYear());
  const monthNumber = date.getMonth() + 1;
  const dayNumber = date.getDate();

  const replacements: Record<string, string> = {
    YYYY: year,
    YY: year.slice(-2),
    MM: String(monthNumber).padStart(2, "0"),
    M: String(monthNumber),
    DD: String(dayNumber).padStart(2, "0"),
    D: String(dayNumber),
  };

  return pattern.replace(/YYYY|YY|MM|M|DD|D/g, (token) => replacements[token] ?? token);
}

function buildDailyNotePath(vaultRoot: string, config: DailyNotesConfig, date: Date) {
  const folder = config.folder?.trim() ?? "";
  const format = config.format?.trim() || "YYYY-MM-DD";
  const fileStem = formatDatePattern(format, date);
  const relativeFilePath = folder ? path.join(folder, `${fileStem}.md`) : `${fileStem}.md`;
  const absoluteFilePath = path.join(vaultRoot, relativeFilePath);
  const targetDir = path.dirname(absoluteFilePath);

  return {
    absoluteFilePath,
    targetDir,
    uriRelativePath: relativeFilePath.split(path.sep).join("/"),
  };
}

export default function Command() {
  async function handleSubmit(values: FormValues) {
    const rawContent = values.content;

    if (!rawContent.trim()) {
      await showToast(Toast.Style.Failure, "Content cannot be empty");
      return;
    }

    const preferences = getPreferenceValues<Preferences.ObsidianLog2Dialy>();
    const vaultRoot = preferences.vaultPath.trim().replace(/[\\/]+$/, "");
    const targetHeading = (preferences.targetHeading || "").trim() || "## Temp Notes";
    const recordMode: "callout" | "plain" = preferences.recordMode === "plain" ? "plain" : "callout";

    const dailyNotesConfig = readDailyNotesConfig(vaultRoot);

    if (!dailyNotesConfig) {
      await showToast(
        Toast.Style.Failure,
        "daily-notes.json not found",
        "Please ensure .obsidian/daily-notes.json exists and is readable",
      );
      return;
    }

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);

    const { absoluteFilePath, targetDir, uriRelativePath } = buildDailyNotePath(vaultRoot, dailyNotesConfig, now);

    try {
      // 1. Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // 2. If file is missing -> prompt Obsidian to create it
      if (!fs.existsSync(absoluteFilePath)) {
        const encodedPath = encodeURIComponent(uriRelativePath);
        const uri = `obsidian://new?file=${encodedPath}&vault=${encodeURIComponent(path.basename(vaultRoot))}`;

        await open(uri);
        await showToast(Toast.Style.Success, "Opened Obsidian to create daily note");
        await closeMainWindow();
        return;
      }

      // 3. If file exists -> insert silently
      const fileContent = fs.readFileSync(absoluteFilePath, "utf8");

      const quotedContent = rawContent
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");

      const calloutEntry = `\n> [!note] ${timeStr}\n${quotedContent}\n`;
      const plainEntry = `\n**${timeStr}**\n\n${rawContent}\n`;
      const newEntry = recordMode === "plain" ? plainEntry : calloutEntry;

      const headingIndex = fileContent.indexOf(targetHeading);

      if (headingIndex === -1) {
        // A: Append section if heading is missing
        const prefix = fileContent.endsWith("\n") ? "\n" : "\n\n";
        const appendText = `${prefix}${targetHeading}\n${newEntry}`;
        fs.appendFileSync(absoluteFilePath, appendText, "utf8");
      } else {
        // B: Insert under existing heading
        const afterHeading = fileContent.slice(headingIndex + targetHeading.length);
        const nextHeadingRegex = /\n## /g;
        const nextHeadingMatch = nextHeadingRegex.exec(afterHeading);

        const insertIndex = nextHeadingMatch
          ? headingIndex + targetHeading.length + nextHeadingMatch.index
          : fileContent.length;

        const newFileContent = fileContent.slice(0, insertIndex) + newEntry + fileContent.slice(insertIndex);

        fs.writeFileSync(absoluteFilePath, newFileContent, "utf8");
      }

      await showToast(Toast.Style.Success, "Saved");
      setTimeout(async () => {
        await closeMainWindow();
      }, 500);
    } catch (e) {
      await showToast(Toast.Style.Failure, "Error", e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log to Obsidian" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Multi-line text supported. Press Cmd+Enter to submit."
        enableMarkdown={true}
      />
    </Form>
  );
}
