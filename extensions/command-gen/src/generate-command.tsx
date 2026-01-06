import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Clipboard,
  closeMainWindow,
  showHUD,
  Icon,
  LocalStorage,
  getSelectedText,
} from "@raycast/api";
import { useState, useEffect } from "react";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { execSync } from "child_process";

interface Preferences {
  model: "claude-haiku" | "gemini-flash-lite";
  anthropicApiKey?: string;
  googleApiKey?: string;
}

const HISTORY_KEY = "command-history";
const MAX_HISTORY = 20;

const SYSTEM_PROMPT = `You generate CLI commands. Output ONLY the raw command - no explanations, no preamble, no markdown, no code blocks, no backticks, no commentary. Just the command itself, nothing else.

Rules:
- Output ONLY the command, absolutely nothing else
- No "Here's the command:" or similar phrases
- No explanations before or after
- If multiple commands needed, chain with && or ;
- Keep it simple - prefer the most straightforward solution
- Context (current app, directory, selected text) is provided for reference - only use it if directly relevant to the request. Ignore irrelevant context.

Examples:
User: "find all js files modified in the last day"
find . -name "*.js" -mtime -1

User: "list disk usage sorted by size"
du -sh * | sort -h

User: "kill process on port 3000"
lsof -ti:3000 | xargs kill -9

User: "create a p5.js sketch with a circle"
cat > sketch.js << 'EOF'
function setup() {
  createCanvas(400, 400);
}
function draw() {
  background(220);
  circle(200, 200, 100);
}
EOF`;

interface Context {
  selectedText?: string;
  currentApp?: string;
  currentDirectory?: string;
}

function runAppleScript(script: string): string | undefined {
  try {
    return execSync(`osascript -e '${script}'`, { encoding: "utf-8" }).trim();
  } catch {
    return undefined;
  }
}

async function gatherContext(): Promise<Context> {
  const context: Context = {};

  // Get selected text from previous app
  try {
    context.selectedText = await getSelectedText();
  } catch {
    // No text selected or not available
  }

  // Get the previous frontmost app (before Raycast)
  const appScript = `
    tell application "System Events"
      set appList to name of every application process whose visible is true and frontmost is false
      if (count of appList) > 0 then
        return item 1 of appList
      end if
    end tell
  `;
  context.currentApp = runAppleScript(appScript);

  // Get current directory from Terminal/iTerm if that's the previous app
  if (context.currentApp === "Terminal") {
    const dirScript = `tell application "Terminal" to get custom title of selected tab of front window`;
    const dir = runAppleScript(dirScript);
    if (!dir) {
      // Fallback: try to get from window name which often contains the path
      const windowScript = `tell application "Terminal" to get name of front window`;
      context.currentDirectory = runAppleScript(windowScript);
    } else {
      context.currentDirectory = dir;
    }
  } else if (
    context.currentApp === "iTerm2" ||
    context.currentApp === "iTerm"
  ) {
    const dirScript = `tell application "iTerm2" to tell current session of current window to get variable named "path"`;
    context.currentDirectory = runAppleScript(dirScript);
  }

  return context;
}

const RELEVANT_APPS = new Set([
  "Terminal",
  "iTerm2",
  "iTerm",
  "Hyper",
  "Warp",
  "Alacritty",
  "kitty",
  "Code",
  "Cursor",
  "Zed",
  "Sublime Text",
  "Atom",
  "WebStorm",
  "IntelliJ IDEA",
  "PyCharm",
  "Visual Studio Code",
]);

function buildPrompt(userPrompt: string, context: Context): string {
  const parts: string[] = [];

  // Only include app context if it's a relevant dev tool
  if (context.currentApp && RELEVANT_APPS.has(context.currentApp)) {
    parts.push(`Current app: ${context.currentApp}`);
  }
  if (context.currentDirectory) {
    parts.push(`Current directory: ${context.currentDirectory}`);
  }
  // Only include selected text if it exists and isn't too long
  if (context.selectedText && context.selectedText.length < 2000) {
    parts.push(`Selected text:\n${context.selectedText}`);
  }

  if (parts.length > 0) {
    return `Context:\n${parts.join("\n")}\n\nRequest: ${userPrompt}`;
  }
  return userPrompt;
}

async function getHistory(): Promise<string[]> {
  const stored = await LocalStorage.getItem<string>(HISTORY_KEY);
  return stored ? JSON.parse(stored) : [];
}

async function addToHistory(prompt: string): Promise<string[]> {
  const history = await getHistory();
  const filtered = history.filter((h) => h !== prompt);
  const updated = [prompt, ...filtered].slice(0, MAX_HISTORY);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

async function callAI(
  preferences: Preferences,
  prompt: string,
): Promise<string> {
  if (preferences.model === "gemini-flash-lite") {
    if (!preferences.googleApiKey) {
      throw new Error("Google API key required for Gemini");
    }
    const genAI = new GoogleGenerativeAI(preferences.googleApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction: SYSTEM_PROMPT,
    });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } else {
    if (!preferences.anthropicApiKey) {
      throw new Error("Anthropic API key required for Claude");
    }
    const client = new Anthropic({ apiKey: preferences.anthropicApiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });
    return message.content[0].type === "text"
      ? message.content[0].text.trim()
      : "";
  }
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [listKey, setListKey] = useState(0);

  useEffect(() => {
    getHistory().then(setHistory);
  }, []);

  async function generateCommand(prompt: string, copyOnly = false) {
    if (!prompt.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a description",
      });
      return;
    }

    setIsLoading(true);

    try {
      const preferences = getPreferenceValues<Preferences>();
      const context = await gatherContext();
      const fullPrompt = buildPrompt(prompt, context);

      const command = await callAI(preferences, fullPrompt);

      if (!command) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No command generated",
        });
        setIsLoading(false);
        return;
      }

      const updatedHistory = await addToHistory(prompt);
      setHistory(updatedHistory);
      await closeMainWindow();

      if (copyOnly) {
        await Clipboard.copy(command);
        await showHUD("Command copied");
      } else {
        await Clipboard.paste(command);
        await showHUD("Command pasted");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
      setIsLoading(false);
    }
  }

  const filteredHistory = searchText.trim()
    ? history.filter((item) =>
        item.toLowerCase().includes(searchText.toLowerCase()),
      )
    : history;

  return (
    <List
      key={listKey}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Describe the command you need..."
      filtering={false}
    >
      {searchText.trim() && (
        <List.Item
          icon={Icon.Terminal}
          title="Generate Command"
          subtitle={searchText}
          actions={
            <ActionPanel>
              <Action
                title="Generate & Paste"
                onAction={() => generateCommand(searchText)}
              />
              <Action
                title="Generate & Copy"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={() => generateCommand(searchText, true)}
              />
            </ActionPanel>
          }
        />
      )}
      {filteredHistory.length > 0 && (
        <List.Section title="History">
          {filteredHistory.map((item, index) => (
            <List.Item
              key={index}
              icon={Icon.Clock}
              title={item}
              actions={
                <ActionPanel>
                  <Action
                    title="Use Prompt"
                    onAction={() => {
                      // BEHAVIOR: Selecting a history item should:
                      // 1. Populate the search bar with the item text (so user can edit)
                      // 2. Reset selection to "Generate Command" (so Enter generates)
                      //
                      // The setTimeout ensures searchText state is committed before
                      // the List remounts (via key change). Without this delay, the
                      // remount happens first and searchText gets lost.
                      setSearchText(item);
                      setTimeout(() => setListKey((k) => k + 1), 0);
                    }}
                  />
                  <Action
                    title="Clear History"
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    onAction={async () => {
                      await LocalStorage.removeItem(HISTORY_KEY);
                      setHistory([]);
                      await showToast({ title: "History cleared" });
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
