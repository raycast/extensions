import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  useNavigation,
  confirmAlert,
  Alert,
  Color,
  showHUD,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { readdir, stat, rename as fsRename } from "fs/promises";
import { join } from "path";
import {
  type RenameScript,
  type ScriptResult,
  listScripts,
  deleteScript,
  executeScript,
  stepLabel,
  stepTypeLabel,
} from "./scripts";
import CreateScript from "./create-script";
import { getFinderFolder } from "./finder";
import { saveUndoState } from "./instant-runner";

function isHidden(name: string): boolean {
  return name.startsWith(".");
}

function PreviewAndRun({
  folderPath,
  results,
  script,
}: {
  folderPath: string;
  results: ScriptResult[];
  script: RenameScript;
}) {
  const changed = results.filter((r) => r.original !== r.renamed);

  async function doRename() {
    const confirmed = await confirmAlert({
      title: `Run "${script.name}" on ${changed.length} files?`,
      message: "You can undo this with the 'Undo Last Rename' command.",
      primaryAction: { title: "Rename" },
    });
    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Renaming..." });

      for (const r of changed) {
        await fsRename(join(folderPath, r.original), join(folderPath, r.renamed));
      }

      await saveUndoState({
        folderPath,
        changes: changed.map((r) => ({ original: r.original, renamed: r.renamed })),
        actionName: `Script: ${script.name}`,
        timestamp: Date.now(),
      });

      await showHUD(`"${script.name}" renamed ${changed.length} files`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Rename failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List navigationTitle={`Preview: ${script.name}`}>
      <List.Section title={`${changed.length} of ${results.length} files will be renamed`}>
        {results.map((r, i) => {
          const isChanged = r.original !== r.renamed;
          return (
            <List.Item
              key={i}
              icon={{
                source: !r.matched ? Icon.Minus : isChanged ? Icon.ArrowRight : Icon.Checkmark,
                tintColor: !r.matched ? Color.SecondaryText : isChanged ? Color.Blue : Color.Green,
              }}
              title={r.original}
              subtitle={r.matched ? (isChanged ? `→ ${r.renamed}` : "(unchanged)") : "(filtered out)"}
              actions={
                <ActionPanel>
                  {changed.length > 0 && (
                    <Action title="Confirm Rename All" icon={Icon.Checkmark} onAction={doRename} />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export default function RunScript() {
  const { push } = useNavigation();
  const [scripts, setScripts] = useState<RenameScript[]>([]);
  const [loading, setLoading] = useState(true);

  async function refreshScripts() {
    const loaded = await listScripts();
    setScripts(loaded);
    setLoading(false);
  }

  useEffect(() => {
    refreshScripts();
  }, []);

  async function runScript(script: RenameScript) {
    const folderPath = await getFinderFolder();
    if (!folderPath) {
      await showToast({ style: Toast.Style.Failure, title: "Open a Finder window first" });
      return;
    }

    const entries = await readdir(folderPath);
    const files: string[] = [];
    for (const entry of entries) {
      if (isHidden(entry)) continue;
      const s = await stat(join(folderPath, entry));
      if (s.isFile()) files.push(entry);
    }
    files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

    if (files.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No files in folder" });
      return;
    }

    const results = executeScript(files, script);
    push(<PreviewAndRun folderPath={folderPath} results={results} script={script} />);
  }

  async function handleDelete(script: RenameScript) {
    const confirmed = await confirmAlert({
      title: `Delete "${script.name}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await deleteScript(script.id);
    setScripts(scripts.filter((s) => s.id !== script.id));
    await showToast({ style: Toast.Style.Success, title: `Deleted "${script.name}"` });
  }

  return (
    <List isLoading={loading}>
      {scripts.length === 0 && !loading && (
        <List.EmptyView
          title="No Scripts"
          description="Create a script with 'Create Rename Script' first."
          icon={Icon.Document}
        />
      )}
      {scripts.map((script) => (
        <List.Item
          key={script.id}
          icon={{ source: Icon.PlayFilled, tintColor: Color.Green }}
          title={script.name}
          subtitle={script.description}
          accessories={[
            { text: script.fileFilter ? `Filter: ${script.fileFilter}` : "All files" },
            { text: `${script.steps.length} steps` },
          ]}
          actions={
            <ActionPanel>
              <Action title="Run Script" icon={Icon.PlayFilled} onAction={() => runScript(script)} />
              <Action
                title="Edit Script"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={() => push(<CreateScript existingScript={script} onSaved={refreshScripts} />)}
              />
              <Action
                title="View Steps"
                icon={Icon.List}
                onAction={() =>
                  push(
                    <List navigationTitle={script.name}>
                      <List.Section title="Pipeline">
                        {script.steps.map((step, i) => (
                          <List.Item
                            key={i}
                            icon={{ source: Icon.ChevronRight, tintColor: Color.Blue }}
                            title={`Step ${i + 1}: ${stepTypeLabel(step.type)}`}
                            subtitle={stepLabel(step)}
                          />
                        ))}
                      </List.Section>
                      {script.fileFilter && (
                        <List.Section title="Filter">
                          <List.Item icon={Icon.Filter} title={script.fileFilter} />
                        </List.Section>
                      )}
                    </List>,
                  )
                }
              />
              <Action
                title="Delete Script"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(script)}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
