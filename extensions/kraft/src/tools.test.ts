import assert from "node:assert/strict";
import fs from "node:fs";
import packageJson from "../package.json";
import { defaultToolSettings, getDefaultToolSetting } from "./tool-settings";
import { sortExecutionToolsByUsage } from "./tool-usage";
import { allTools, executionTools, getToolById, menuSections } from "./tools";

assert.ok(allTools.length >= 8, "toolbox should expose text, input, and configuration tools");

const translate = getToolById("translate");
assert.equal(translate?.title, "Translate");
assert.equal(translate?.kind, "execution");
assert.equal(translate?.mode, "translate");
assert.equal(translate?.launch.command, "translate");
assert.deepEqual(translate?.launch.context, {
  mode: "translate",
  loadSelected: true,
  loadClipboard: true,
  autoStart: true,
});

const selected = getToolById("selected");
assert.equal(selected?.title, "Ask About Selected Text");
assert.equal(selected?.kind, "input");
assert.equal(selected?.launch.command, "selected");

const appSettings = getToolById("app-settings");
assert.equal(appSettings?.title, "App Settings");
assert.equal(appSettings?.kind, "configuration");

const apiSettings = getToolById("api-settings");
assert.equal(apiSettings?.title, "API Settings");
assert.equal(apiSettings?.kind, "configuration");

assert.deepEqual(
  menuSections.map((section) => section.title),
  ["Text Tools", "Input Sources", "Configuration"],
);

assert.deepEqual(
  executionTools.map((tool) => tool.id),
  ["translate", "polishing", "summarize", "what"],
);

assert.equal(getToolById("translate")?.workflow?.length, 4);
assert.equal(getToolById("what")?.defaultConversationEnabled, true);
assert.equal(defaultToolSettings.translate.enableConversation, false);
assert.equal(defaultToolSettings.what.enableConversation, true);
assert.equal(getDefaultToolSetting("summarize").renderer, "markdown");

assert.equal(
  allTools.some((tool) => /vendor-only/i.test(tool.title + tool.description)),
  false,
);

assert.equal("preferences" in packageJson, false);
assert.deepEqual(
  packageJson.commands
    .filter((command) => ["kraft", "translate", "polishing", "summarize", "what"].includes(command.name))
    .map((command) => command.name),
  ["kraft", "translate", "polishing", "summarize", "what"],
);
assert.equal(
  packageJson.commands.some((command) => "preferences" in command),
  false,
);

assert.deepEqual(
  sortExecutionToolsByUsage(executionTools, [{ mode: "summarize" }, { mode: "what" }, { mode: "summarize" }]).map(
    (tool) => tool.id,
  ),
  ["summarize", "what", "translate", "polishing"],
);

for (const [file, mode] of [
  ["src/translate.tsx", "translate"],
  ["src/polishing.tsx", "polishing"],
  ["src/summarize.tsx", "summarize"],
  ["src/what.tsx", "what"],
]) {
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, new RegExp(`getBase\\(props, "${mode}", true, true, true\\)`));
}

const customToolsSource = fs.readFileSync("src/custom-tools.ts", "utf8");
assert.match(
  customToolsSource,
  /launch:\s*\{\s*command:\s*"kraft",\s*context:\s*\{\s*mode,\s*loadSelected:\s*true,\s*loadClipboard:\s*true,\s*autoStart:\s*true\s*\}/s,
);

const inputToolPickerSource = fs.readFileSync("src/views/input-tool-picker.tsx", "utf8");
assert.match(inputToolPickerSource, /selectedItemId=\{sortedTools\[0\]\?\.id\}/);
assert.match(inputToolPickerSource, /id=\{tool\.id\}/);

const contentSource = fs.readFileSync("src/views/content.tsx", "utf8");
assert.match(contentSource, /title="Run Again"/);
assert.match(contentSource, /onAction=\{\(\) => rerunRecord\(record\)\}/);
assert.match(contentSource, /const getRecordActionPanel = \(record: Record\) => \(\s*<ActionPanel>\s*<Action/s);
assert.doesNotMatch(contentSource, /toast\.title\s*=\s*"AI result ready"/);
assert.match(
  contentSource,
  /await showToast\(\{\s*title:\s*"AI result ready",\s*style:\s*Toast\.Style\.Success,\s*\}/s,
);

const useQuerySource = fs.readFileSync("src/hooks/useQuery.tsx", "utf8");
assert.match(useQuerySource, /const \[from, setFrom\] = useState<string>\("en"\)/);
assert.match(useQuerySource, /const shouldLoadClipboard =/);
assert.doesNotMatch(useQuerySource, /title:\s*"Selected text couldn't load"/);
