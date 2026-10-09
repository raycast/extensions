import {
  Action,
  ActionPanel,
  confirmAlert,
  environment,
  Form,
  getPreferenceValues,
  Icon,
  List,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { copyFile, lstat, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { useCallback, useEffect, useState } from "react";
import { configureLatexSnippetVersion } from "./lib/latex-setup";
import { getRegisteredVaults, getSelectedVault, setSelectedVault } from "./lib/storage";

const execFileAsync = promisify(execFile);
const legacyName = "lates-suite-snippets.js";

interface SnippetFile {
  name: string;
  path: string;
}

interface Snippet {
  line: number;
  trigger: string;
  replacement: string;
  options: string;
}

const SINGLE_LINE =
  /^(\s*)\{\s*trigger:\s*("(?:\\.|[^"\\])*")\s*,\s*replacement:\s*("(?:\\.|[^"\\])*")\s*,\s*options:\s*("(?:\\.|[^"\\])*")\s*\},?\s*$/;

function parsedSnippet(line: string, index: number): Snippet | undefined {
  const match = SINGLE_LINE.exec(line);
  if (!match) return undefined;
  try {
    return {
      line: index,
      trigger: JSON.parse(match[2]),
      replacement: JSON.parse(match[3]),
      options: JSON.parse(match[4]),
    };
  } catch {
    return undefined;
  }
}

function snippetLine(snippet: Omit<Snippet, "line">, indent = "  "): string {
  return `${indent}{trigger: ${JSON.stringify(snippet.trigger)}, replacement: ${JSON.stringify(snippet.replacement)}, options: ${JSON.stringify(snippet.options)}},`;
}

function fileName(input: string): string {
  const name = input.trim().endsWith(".js") ? input.trim() : `${input.trim()}.js`;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.js$/.test(name) || name.includes("..") || path.basename(name) !== name) {
    throw new Error("Use a simple .js filename without path separators.");
  }
  return name;
}

async function physicalFolder(folder: string): Promise<string> {
  if (!folder || !path.isAbsolute(folder)) throw new Error("Choose an absolute LaTeX snippets folder in preferences.");
  const resolved = path.resolve(folder);
  const stats = await lstat(resolved);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error("The chosen LaTeX snippets folder must be a physical directory.");
  }
  return resolved;
}

async function physicalFile(folder: string, file: SnippetFile): Promise<void> {
  const resolved = await physicalFolder(folder);
  if (file.path !== path.join(resolved, fileName(file.name))) {
    throw new Error("This JavaScript file is outside the chosen folder.");
  }
  const stats = await lstat(file.path);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error("The JavaScript file must be a physical file.");
}

async function saveFile(folder: string, file: SnippetFile, previous: string, next: string): Promise<void> {
  await physicalFile(folder, file);
  if ((await readFile(file.path, "utf8")) !== previous) throw new Error("The file changed. Reopen it before saving.");
  if (next === previous) return;
  const backupFolder = path.join(environment.supportPath, "latex-snippet-backups");
  await mkdir(backupFolder, { recursive: true });
  const backup = path.join(backupFolder, `${file.name}-${Date.now()}-${crypto.randomUUID()}.js`);
  await copyFile(file.path, backup, constants.COPYFILE_EXCL);
  const temporary = path.join(folder, `.${file.name}.${crypto.randomUUID()}.tmp`);
  try {
    await writeFile(temporary, next, { flag: "wx" });
    await physicalFile(folder, file);
    if ((await readFile(file.path, "utf8")) !== previous) throw new Error("The file changed during editing.");
    await rename(temporary, file.path);
  } finally {
    await rm(temporary, { force: true });
  }
}

function FileEditor({ folder, file, onSaved }: { folder: string; file: SnippetFile; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [original, setOriginal] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    physicalFile(folder, file)
      .then(() => readFile(file.path, "utf8"))
      .then((value) => {
        setOriginal(value);
        setContent(value);
      })
      .catch(
        (error) => void showToast({ style: Toast.Style.Failure, title: "Cannot read file", message: String(error) }),
      )
      .finally(() => setLoading(false));
  }, [folder, file.path]);

  async function submit(values: { content: string }) {
    try {
      await saveFile(folder, file, original, values.content);
      await showToast({ style: Toast.Style.Success, title: "JavaScript file saved" });
      onSaved();
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Cannot save file", message: String(error) });
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save JavaScript File" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="This file lives only in your chosen LaTeX snippets folder. Vaults using this version load changes after Obsidian reloads." />
      <Form.TextArea id="content" title={file.name} value={content} onChange={setContent} />
    </Form>
  );
}

function SnippetEditor({
  folder,
  file,
  snippet,
  onSaved,
}: {
  folder: string;
  file: SnippetFile;
  snippet?: Snippet;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  async function submit(values: { trigger: string; replacement: string; options: string }) {
    try {
      if (!values.trigger.trim()) throw new Error("Enter a trigger.");
      await physicalFile(folder, file);
      const original = await readFile(file.path, "utf8");
      const lines = original.split("\n");
      if (snippet) {
        const current = parsedSnippet(lines[snippet.line] ?? "", snippet.line);
        if (
          !current ||
          current.trigger !== snippet.trigger ||
          current.replacement !== snippet.replacement ||
          current.options !== snippet.options
        ) {
          throw new Error("This snippet changed. Reopen the list before editing.");
        }
        const indent = SINGLE_LINE.exec(lines[snippet.line])?.[1] ?? "  ";
        lines[snippet.line] = snippetLine(values, indent);
      } else {
        const start = lines.findIndex((line) => /^\s*export\s+default\s*\[\s*$/.test(line));
        const end = lines.findIndex((line, index) => index > start && /^\s*\]\s*;?\s*$/.test(line));
        if (
          start < 0 ||
          end < 0 ||
          lines.slice(start + 1, end).some((line, i) => line.trim() && !parsedSnippet(line, start + 1 + i))
        ) {
          throw new Error(
            "Use the complete file editor for JavaScript that is not a simple array of one-line snippets.",
          );
        }
        lines.splice(end, 0, snippetLine(values));
      }
      await saveFile(folder, file, original, lines.join("\n"));
      await showToast({ style: Toast.Style.Success, title: snippet ? "Snippet updated" : "Snippet added" });
      onSaved();
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Cannot save snippet", message: String(error) });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={snippet ? "Save Snippet" : "Add Snippet"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="trigger" title="Trigger" defaultValue={snippet?.trigger} />
      <Form.TextArea id="replacement" title="Replacement" defaultValue={snippet?.replacement} />
      <Form.TextField id="options" title="Options" defaultValue={snippet?.options ?? "mA"} />
      <Form.Description text="For regular expressions, functions, and custom JavaScript, use Edit JavaScript File." />
    </Form>
  );
}

function SnippetList({ folder, file }: { folder: string; file: SnippetFile }) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    physicalFile(folder, file)
      .then(() => readFile(file.path, "utf8"))
      .then((content) =>
        setSnippets(
          content
            .split("\n")
            .map(parsedSnippet)
            .filter((item): item is Snippet => Boolean(item)),
        ),
      )
      .catch(
        (error) =>
          void showToast({ style: Toast.Style.Failure, title: "Cannot read snippets", message: String(error) }),
      )
      .finally(() => setLoading(false));
  }, [folder, file.path]);
  useEffect(reload, [reload]);
  const add = <SnippetEditor folder={folder} file={file} onSaved={reload} />;
  return (
    <List isLoading={loading} searchBarPlaceholder="Search snippets...">
      <List.EmptyView
        title="No Simple Snippets Found"
        description="Complex JavaScript remains available in the complete file editor."
        actions={
          <ActionPanel>
            <Action.Push title="Add Snippet" target={add} />
            <Action.Push
              title="Edit JavaScript File"
              target={<FileEditor folder={folder} file={file} onSaved={reload} />}
            />
          </ActionPanel>
        }
      />
      {snippets.map((snippet) => (
        <List.Item
          key={snippet.line}
          title={snippet.trigger}
          subtitle={snippet.replacement}
          accessories={[{ text: snippet.options }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Snippet"
                target={<SnippetEditor folder={folder} file={file} snippet={snippet} onSaved={reload} />}
              />
              <Action.Push title="Add Snippet" target={add} />
              <Action.Push
                title="Edit JavaScript File"
                target={<FileEditor folder={folder} file={file} onSaved={reload} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CreateFile({ folder, source, onSaved }: { folder: string; source?: SnippetFile; onSaved: () => void }) {
  const { pop } = useNavigation();
  async function submit(values: { name: string }) {
    try {
      const destinationFolder = await physicalFolder(folder);
      const name = fileName(values.name);
      const destination = path.join(destinationFolder, name);
      if (source) {
        const stats = await lstat(source.path);
        if (!stats.isFile() || stats.isSymbolicLink())
          throw new Error("The source must be a physical JavaScript file.");
        await copyFile(source.path, destination, constants.COPYFILE_EXCL);
      } else {
        await writeFile(destination, "export default [\n];\n", { flag: "wx" });
      }
      await showToast({ style: Toast.Style.Success, title: "JavaScript file created", message: destination });
      onSaved();
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Cannot create file", message: String(error) });
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={source ? "Copy into Chosen Folder" : "Create JavaScript File"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Files are created only in ${folder}.`} />
      <Form.TextField id="name" title="File Name" defaultValue={source?.name} placeholder="my-snippets.js" />
    </Form>
  );
}

async function activeVersion(vault: string, folder: string): Promise<{ path?: string; enabled: boolean }> {
  try {
    const dataPath = path.join(vault, ".obsidian", "plugins", "obsidian-latex-suite", "data.json");
    const stats = await lstat(dataPath);
    if (!stats.isFile() || stats.isSymbolicLink()) return { enabled: false };
    const parsed: unknown = JSON.parse(await readFile(dataPath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { enabled: false };
    const settings = parsed as Record<string, unknown>;
    const selected = settings.snippetsFileLocation;
    const versionPath =
      typeof selected === "string" && path.dirname(selected) === folder && selected.endsWith(".js")
        ? selected
        : undefined;
    if (!versionPath) return { enabled: false };
    const versionStats = await lstat(versionPath);
    if (!versionStats.isFile() || versionStats.isSymbolicLink()) return { enabled: false };
    return { path: versionPath, enabled: settings.snippetsEnabled === true && settings.loadSnippetsFromFile === true };
  } catch {
    return { enabled: false };
  }
}

async function knownVaults(): Promise<string[]> {
  const registered = await getRegisteredVaults();
  try {
    const registry = path.join(homedir(), "Library", "Application Support", "obsidian", "obsidian.json");
    const parsed: unknown = JSON.parse(await readFile(registry, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !("vaults" in parsed)) {
      return registered;
    }
    const entries = parsed.vaults;
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) return registered;
    const discovered = Object.values(entries).flatMap((entry) =>
      entry &&
      typeof entry === "object" &&
      !Array.isArray(entry) &&
      "path" in entry &&
      typeof entry.path === "string" &&
      path.isAbsolute(entry.path)
        ? [path.resolve(entry.path)]
        : [],
    );
    return [...new Set([...registered, ...discovered])];
  } catch {
    return registered;
  }
}

export default function LatexHub({ initialTargetVault }: { initialTargetVault?: string }) {
  const { defaultVaultPath } = getPreferenceValues<Preferences>();
  const latexSnippetsFolder: string | undefined = (
    getPreferenceValues<Preferences>() as unknown as { latexSnippetsFolder?: string }
  ).latexSnippetsFolder;
  const folder = latexSnippetsFolder ? path.resolve(latexSnippetsFolder) : "";
  const [files, setFiles] = useState<SnippetFile[]>([]);
  const [legacy, setLegacy] = useState<SnippetFile>();
  const [targetVaults, setTargetVaults] = useState<string[]>([]);
  const [targetVault, setTargetVault] = useState<string>();
  const [active, setActive] = useState<{ path?: string; enabled: boolean }>({ enabled: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(
    async (selectedVault?: string) => {
      setLoading(true);
      try {
        const chosenFolder = await physicalFolder(folder);
        const entries = await readdir(chosenFolder, { withFileTypes: true });
        const found = entries
          .filter(
            (entry) =>
              entry.isFile() && /^[A-Za-z0-9][A-Za-z0-9._-]*\.js$/.test(entry.name) && !entry.name.includes(".."),
          )
          .map((entry) => ({ name: entry.name, path: path.join(chosenFolder, entry.name) }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setFiles(found);
        const oldFile = path.join(defaultVaultPath, legacyName);
        try {
          const stats = await lstat(oldFile);
          setLegacy(
            stats.isFile() && !stats.isSymbolicLink() && path.dirname(oldFile) !== chosenFolder
              ? { name: legacyName, path: oldFile }
              : undefined,
          );
        } catch {
          setLegacy(undefined);
        }
        const registered = await knownVaults();
        const valid: string[] = [];
        for (const vault of registered) {
          if (path.resolve(vault) === path.resolve(defaultVaultPath)) continue;
          try {
            const stats = await lstat(vault);
            if (stats.isDirectory() && !stats.isSymbolicLink()) valid.push(vault);
          } catch {
            // A registered vault may have moved.
          }
        }
        setTargetVaults(valid);
        const stored = selectedVault ?? initialTargetVault ?? (await getSelectedVault());
        const target = stored && valid.includes(stored) ? stored : valid[0];
        setTargetVault(target);
        setActive(target ? await activeVersion(target, chosenFolder) : { enabled: false });
        setError("");
      } catch (failure) {
        setError(String(failure));
        setFiles([]);
      } finally {
        setLoading(false);
      }
    },
    [defaultVaultPath, folder, initialTargetVault],
  );
  useEffect(() => {
    void reload();
  }, [reload]);

  async function configure(file: SnippetFile) {
    if (!targetVault) {
      await showToast({ style: Toast.Style.Failure, title: "Select a target vault first" });
      return;
    }
    const confirmed = await confirmAlert({
      title: `Use ${file.name} in ${path.basename(targetVault)}?`,
      message: `LaTeX Suite will load ${file.path}. Only this vault's plugin settings will change; no JavaScript file will be created in the vault.`,
      primaryAction: { title: "Use This Version" },
    });
    if (!confirmed) return;
    try {
      const result = await configureLatexSnippetVersion(targetVault, folder, file.path);
      await showToast({
        style: result.snippetsEnabled ? Toast.Style.Success : Toast.Style.Failure,
        title: result.changed ? "Snippet version selected" : "Snippet version already selected",
        message: result.snippetsEnabled
          ? "Reload Obsidian or LaTeX Suite to load the selected version."
          : "Enable snippets in LaTeX Suite settings, then reload Obsidian.",
      });
      await reload(targetVault);
    } catch (failure) {
      await showToast({ style: Toast.Style.Failure, title: "Cannot configure LaTeX Suite", message: String(failure) });
    }
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search JavaScript files in chosen folder..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Target Vault"
          value={targetVault ?? ""}
          onChange={async (value) => {
            if (!value) return;
            await setSelectedVault(value);
            await reload(value);
          }}
        >
          <List.Dropdown.Item title="Select a Target Vault" value="" />
          {targetVaults.map((vault) => (
            <List.Dropdown.Item key={vault} title={path.basename(vault)} value={vault} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          title="Choose a LaTeX Snippets Folder"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={() => void openExtensionPreferences()} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title="Shared Folder" subtitle={folder}>
            <List.Item
              title={active.path ? `Selected: ${path.basename(active.path)}` : "Choose a version for this vault"}
              icon={active.path && active.enabled ? Icon.CheckCircle : Icon.Gear}
              subtitle={targetVault ? path.basename(targetVault) : "Select a target vault"}
              accessories={[
                { text: active.path && !active.enabled ? "Snippets disabled or external loading off" : undefined },
              ]}
              actions={
                <ActionPanel>
                  <Action.ShowInFinder path={folder} />
                </ActionPanel>
              }
            />
            <List.Item
              title="Create JavaScript File"
              icon={Icon.Plus}
              subtitle="Create only in the chosen folder"
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Create JavaScript File"
                    target={<CreateFile folder={folder} onSaved={() => void reload(targetVault)} />}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Snippet Versions" subtitle={`${files.length} files in the chosen folder`}>
            {files.map((file) => (
              <List.Item
                key={file.path}
                title={file.name}
                icon={active.path === file.path && active.enabled ? Icon.CheckCircle : Icon.Document}
                subtitle={
                  active.path === file.path
                    ? active.enabled
                      ? "Active in this vault"
                      : "Selected · enable snippets in LaTeX Suite"
                    : "Available"
                }
                actions={
                  <ActionPanel>
                    <Action title="Use This Version in This Vault" onAction={() => void configure(file)} />
                    <Action.Push title="Browse Snippets" target={<SnippetList folder={folder} file={file} />} />
                    <Action.Push
                      title="Edit JavaScript File"
                      target={<FileEditor folder={folder} file={file} onSaved={() => void reload(targetVault)} />}
                    />
                    <Action title="Open in CotEditor" onAction={() => open(file.path, "CotEditor")} />
                    <Action.Push
                      title="Duplicate in Shared Folder"
                      target={<CreateFile folder={folder} source={file} onSaved={() => void reload(targetVault)} />}
                    />
                    <Action.ShowInFinder path={file.path} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          {legacy && (
            <List.Section title="Existing Default Vault File">
              <List.Item
                title={legacy.name}
                icon={Icon.Document}
                subtitle="Read only here · copy it into the chosen folder"
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Copy into Chosen Folder"
                      target={<CreateFile folder={folder} source={legacy} onSaved={() => void reload(targetVault)} />}
                    />
                    <Action.ShowInFinder path={legacy.path} />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
          <List.Section title="Obsidian">
            <List.Item
              title="Restart Obsidian"
              icon={Icon.ArrowClockwise}
              subtitle="Reload shared snippets after changing files or settings"
              actions={
                <ActionPanel>
                  <Action
                    title="Restart Obsidian"
                    onAction={async () => {
                      try {
                        await execFileAsync("osascript", [
                          "-e",
                          'tell application "Obsidian" to quit',
                          "-e",
                          "delay 1",
                          "-e",
                          'tell application "Obsidian" to activate',
                        ]);
                        await showToast({ style: Toast.Style.Success, title: "Obsidian restarted" });
                      } catch (failure) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Cannot restart Obsidian",
                          message: String(failure),
                        });
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      )}
    </List>
  );
}
