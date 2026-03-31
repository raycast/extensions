import {
  ActionPanel,
  Action,
  Form,
  List,
  Icon,
  showToast,
  Toast,
  useNavigation,
  confirmAlert,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { readdir, stat, rename as fsRename } from "fs/promises";
import { join, extname } from "path";
import { getFinderFolder } from "./finder";
import { saveUndoState } from "./instant-runner";

interface ReplaceRule {
  id: string;
  find: string;
  replace: string;
  isRegex: boolean;
  caseSensitive: boolean;
}

interface RenamePreview {
  original: string;
  renamed: string;
  changed: boolean;
}

function isHidden(name: string): boolean {
  return name.startsWith(".");
}

function matchesGlob(fileName: string, pattern: string): boolean {
  if (!pattern || pattern === "*" || pattern === "*.*") return true;

  // Support comma-separated patterns: "*.mkv, *.mp4"
  const patterns = pattern.split(",").map((p) => p.trim());
  return patterns.some((p) => {
    // Convert glob to regex: *.mkv -> \.mkv$, *.{mkv,mp4} -> \.(mkv|mp4)$
    let regexStr = p.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".");

    // Handle {a,b,c} brace expansion
    regexStr = regexStr.replace(/\{([^}]+)\}/g, (_, group) => {
      return `(${group.split(",").join("|")})`;
    });

    try {
      return new RegExp(`^${regexStr}$`, "i").test(fileName);
    } catch {
      return false;
    }
  });
}

function applyRules(fileName: string, rules: ReplaceRule[], includeExtension: boolean): string {
  const ext = extname(fileName);
  let name = includeExtension ? fileName : fileName.slice(0, fileName.length - ext.length);

  for (const rule of rules) {
    if (!rule.find) continue;

    if (rule.isRegex) {
      try {
        const flags = rule.caseSensitive ? "g" : "gi";
        const regex = new RegExp(rule.find, flags);
        name = name.replace(regex, rule.replace);
      } catch {
        // Invalid regex, skip this rule
      }
    } else {
      if (rule.caseSensitive) {
        name = name.split(rule.find).join(rule.replace);
      } else {
        // Case-insensitive plain text replace
        try {
          const escaped = rule.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          name = name.replace(new RegExp(escaped, "gi"), rule.replace);
        } catch {
          name = name.split(rule.find).join(rule.replace);
        }
      }
    }
  }

  return includeExtension ? name : name + ext;
}

function PreviewList({ folderPath, previews }: { folderPath: string; previews: RenamePreview[] }) {
  const changedCount = previews.filter((p) => p.changed).length;

  async function doRename() {
    const confirmed = await confirmAlert({
      title: `Rename ${changedCount} files?`,
      message: "You can undo this with the 'Undo Last Rename' command.",
      primaryAction: { title: "Rename" },
    });
    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Renaming files..." });
      const changes: { original: string; renamed: string }[] = [];
      for (const p of previews) {
        if (!p.changed) continue;
        await fsRename(join(folderPath, p.original), join(folderPath, p.renamed));
        changes.push({ original: p.original, renamed: p.renamed });
      }
      await saveUndoState({ folderPath, changes, actionName: "Smart Find & Replace", timestamp: Date.now() });
      await showToast({ style: Toast.Style.Success, title: "Done!", message: `${changes.length} files renamed` });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Rename failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List navigationTitle={`Preview — ${changedCount} changes`}>
      <List.Section title={`${changedCount} of ${previews.length} files will be renamed`}>
        {previews.map((p, i) => (
          <List.Item
            key={i}
            icon={{
              source: p.changed ? Icon.ArrowRight : Icon.Minus,
              tintColor: p.changed ? Color.Blue : Color.SecondaryText,
            }}
            title={p.original}
            subtitle={p.changed ? `→ ${p.renamed}` : "(unchanged)"}
            actions={
              <ActionPanel>
                {changedCount > 0 && <Action title="Confirm Rename All" icon={Icon.Checkmark} onAction={doRename} />}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

let ruleCounter = 0;
function newRuleId(): string {
  return `rule-${++ruleCounter}`;
}

export default function SmartFindReplace() {
  const { push } = useNavigation();
  const [detectedFolder, setDetectedFolder] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const folder = await getFinderFolder();
      if (folder) setDetectedFolder(folder);
    })();
  }, []);

  const [fileFilter, setFileFilter] = useState("");
  const [includeExtension, setIncludeExtension] = useState(false);

  // Rule fields — up to 5 rules
  const [find1, setFind1] = useState("");
  const [replace1, setReplace1] = useState("");
  const [isRegex1, setIsRegex1] = useState(false);
  const [caseSensitive1, setCaseSensitive1] = useState(true);

  const [find2, setFind2] = useState("");
  const [replace2, setReplace2] = useState("");
  const [isRegex2, setIsRegex2] = useState(false);
  const [caseSensitive2, setCaseSensitive2] = useState(true);

  const [find3, setFind3] = useState("");
  const [replace3, setReplace3] = useState("");
  const [isRegex3, setIsRegex3] = useState(false);
  const [caseSensitive3, setCaseSensitive3] = useState(true);

  function buildRules(): ReplaceRule[] {
    const rules: ReplaceRule[] = [];
    if (find1)
      rules.push({ id: newRuleId(), find: find1, replace: replace1, isRegex: isRegex1, caseSensitive: caseSensitive1 });
    if (find2)
      rules.push({ id: newRuleId(), find: find2, replace: replace2, isRegex: isRegex2, caseSensitive: caseSensitive2 });
    if (find3)
      rules.push({ id: newRuleId(), find: find3, replace: replace3, isRegex: isRegex3, caseSensitive: caseSensitive3 });
    return rules;
  }

  function livePreview(): string {
    const rules = buildRules();
    if (rules.length === 0) return "Enter a find pattern to see a preview";
    const sample = "My.Show.S01E01.720p.BluRay.x264-GROUP.mkv";
    const result = applyRules(sample, rules, includeExtension);
    return `${sample}\n→ ${result}`;
  }

  async function handleSubmit(values: { folder: string[] }) {
    const folderPath = values.folder?.[0] || detectedFolder;
    if (!folderPath) {
      await showToast({ style: Toast.Style.Failure, title: "No folder selected" });
      return;
    }

    const rules = buildRules();
    if (rules.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No rules defined",
        message: "Enter at least one find pattern.",
      });
      return;
    }

    try {
      const entries = await readdir(folderPath);
      const files: string[] = [];
      for (const entry of entries) {
        if (isHidden(entry)) continue;
        const s = await stat(join(folderPath, entry));
        if (!s.isFile()) continue;
        if (fileFilter && !matchesGlob(entry, fileFilter)) continue;
        files.push(entry);
      }

      if (files.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No matching files",
          message: fileFilter ? `No files match pattern "${fileFilter}"` : "The folder is empty.",
        });
        return;
      }

      files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

      const previews: RenamePreview[] = files.map((f) => {
        const renamed = applyRules(f, rules, includeExtension);
        return { original: f, renamed, changed: f !== renamed };
      });

      push(<PreviewList folderPath={folderPath} previews={previews} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error reading folder",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview Renames" icon={Icon.Eye} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={detectedFolder ? [detectedFolder] : undefined}
        info={
          detectedFolder
            ? `Auto-detected from Finder: ${detectedFolder}`
            : "Open a Finder window or select a folder manually"
        }
      />

      <Form.TextField
        id="fileFilter"
        title="File Filter (Optional)"
        placeholder="*.mkv, *.mp4"
        value={fileFilter}
        onChange={setFileFilter}
        info="Glob pattern to filter files. Leave empty for all files. Examples: *.mkv, *.{mkv,mp4}, photo_*"
      />

      <Form.Checkbox
        id="includeExtension"
        label="Include file extension in replacement"
        value={includeExtension}
        onChange={setIncludeExtension}
      />

      <Form.Separator />

      {/* Rule 1 */}
      <Form.Description title="Rule 1" text="" />
      <Form.TextField id="find1" title="Find" placeholder="\.720p\.BluRay.*?-(\w+)" value={find1} onChange={setFind1} />
      <Form.TextField id="replace1" title="Replace" placeholder=".$1" value={replace1} onChange={setReplace1} />
      <Form.Checkbox id="isRegex1" label="Regular Expression" value={isRegex1} onChange={setIsRegex1} />
      <Form.Checkbox id="caseSensitive1" label="Case Sensitive" value={caseSensitive1} onChange={setCaseSensitive1} />

      <Form.Separator />

      {/* Rule 2 */}
      <Form.Description title="Rule 2 (Optional)" text="" />
      <Form.TextField id="find2" title="Find" placeholder="" value={find2} onChange={setFind2} />
      <Form.TextField id="replace2" title="Replace" placeholder="" value={replace2} onChange={setReplace2} />
      <Form.Checkbox id="isRegex2" label="Regular Expression" value={isRegex2} onChange={setIsRegex2} />
      <Form.Checkbox id="caseSensitive2" label="Case Sensitive" value={caseSensitive2} onChange={setCaseSensitive2} />

      <Form.Separator />

      {/* Rule 3 */}
      <Form.Description title="Rule 3 (Optional)" text="" />
      <Form.TextField id="find3" title="Find" placeholder="" value={find3} onChange={setFind3} />
      <Form.TextField id="replace3" title="Replace" placeholder="" value={replace3} onChange={setReplace3} />
      <Form.Checkbox id="isRegex3" label="Regular Expression" value={isRegex3} onChange={setIsRegex3} />
      <Form.Checkbox id="caseSensitive3" label="Case Sensitive" value={caseSensitive3} onChange={setCaseSensitive3} />

      <Form.Separator />

      <Form.Description title="Preview" text={livePreview()} />

      <Form.Description
        title="Regex Tips"
        text={
          "Capture groups: use (pattern) in find, $1 $2 etc. in replace.\n" +
          "Examples:\n" +
          "  • Find: \\.(720|1080)p  Replace: (empty) — removes quality tags\n" +
          "  • Find: (\\w+)\\.(\\w+)  Replace: $2-$1 — swap parts\n" +
          "  • Find: [ _]  Replace: . — replace spaces/underscores with dots\n" +
          "\nRules are applied in order (1 → 2 → 3)."
        }
      />
    </Form>
  );
}
