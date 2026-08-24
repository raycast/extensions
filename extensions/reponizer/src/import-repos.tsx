import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Form,
  Icon,
  Toast,
  confirmAlert,
  popToRoot,
  showToast,
} from "@raycast/api";
import fs from "node:fs/promises";
import path from "node:path";
import { useState } from "react";
import { rebuildIndex } from "./lib/cache";
import { getConfig } from "./lib/config";
import { ExportFile, loadSnapshot, parseExportFile, planImport } from "./lib/exportImport";
import { writeOffloadPlaceholder } from "./lib/offload";
import { cloneRepo, planClone } from "./lib/ops";
import { errorMessage, mapConcurrent, pluralize } from "./lib/util";

type Mode = "clone" | "placeholders";

export default function Command() {
  const config = getConfig();
  const [useSnapshot, setUseSnapshot] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("clone");
  const [isRunning, setIsRunning] = useState(false);

  const submit = async () => {
    setIsRunning(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Importing repository list…" });
    try {
      let exportFile: ExportFile;
      if (useSnapshot) {
        const snapshot = await loadSnapshot();
        if (!snapshot) throw new Error("No Raycast snapshot found. Run “Export Repository List” first.");
        exportFile = snapshot;
      } else {
        if (files.length === 0) throw new Error("Select an export file or enable the Raycast snapshot.");
        exportFile = parseExportFile(await fs.readFile(files[0], "utf8"));
      }

      toast.message = "Scanning local repositories…";
      const index = await rebuildIndex(config.root, config.maxDepth, config.defaultProtocol);
      const plan = planImport(exportFile, index);

      if (plan.missing.length === 0) {
        toast.style = Toast.Style.Success;
        toast.title = "Nothing to import";
        toast.message = `All ${plan.present} repos already present · ${pluralize(plan.localOnly.length, "local-only repo")}`;
        return;
      }

      const verb = mode === "clone" ? "Clone" : "Create placeholders for";
      const confirmed = await confirmAlert({
        title: `${verb} ${pluralize(plan.missing.length, "missing repo")}?`,
        message:
          `${plan.present} already present · ${plan.localOnly.length} local-only (kept)` +
          (plan.unresolvable.length > 0 ? ` · ${plan.unresolvable.length} skipped (no origin URL)` : ""),
        primaryAction: { title: verb, style: Alert.ActionStyle.Default },
      });
      if (!confirmed) {
        toast.hide();
        return;
      }

      let done = 0;
      const failures: string[] = [];
      await mapConcurrent(plan.missing, mode === "clone" ? 2 : 8, async (repo) => {
        try {
          if (mode === "placeholders") {
            await writeOffloadPlaceholder(path.join(config.root, repo.path), repo.path, repo.origin!, repo.remotes);
          } else {
            const clonePlan = planClone(config.root, repo.origin!, config.defaultProtocol);
            if (!clonePlan) throw new Error(`unparseable origin URL: ${repo.origin}`);
            // Preserve the exported location even if it differs from what the URL implies.
            await cloneRepo({ ...clonePlan, destination: path.join(config.root, repo.path), relativePath: repo.path });
          }
        } catch (error) {
          failures.push(`${repo.path}: ${errorMessage(error)}`);
        } finally {
          toast.message = `${++done}/${plan.missing.length}`;
        }
      });

      toast.message = "Refreshing index…";
      await rebuildIndex(config.root, config.maxDepth, config.defaultProtocol);

      if (failures.length > 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "Import finished with failures";
        toast.message = `${plan.missing.length - failures.length} ok · ${failures.length} failed`;
        toast.primaryAction = { title: "Copy Failures", onAction: () => Clipboard.copy(failures.join("\n")) };
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Import finished";
        toast.message = `${verb.split(" ")[0]}d ${pluralize(plan.missing.length, "repo")}`;
        await popToRoot();
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Import failed";
      toast.message = errorMessage(error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Form
      isLoading={isRunning}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" icon={Icon.Download} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Mirror a repository list exported on another machine. Existing repos are never touched or deleted." />
      <Form.Checkbox
        id="useSnapshot"
        label="Use the snapshot stored in Raycast instead of a file"
        value={useSnapshot}
        onChange={setUseSnapshot}
        info="“Export Repository List” stores a snapshot in Raycast local storage, which Raycast Cloud Sync can carry across machines."
      />
      {!useSnapshot && (
        <Form.FilePicker
          id="file"
          title="Export File"
          allowMultipleSelection={false}
          canChooseDirectories={false}
          value={files}
          onChange={setFiles}
        />
      )}
      <Form.Dropdown
        id="mode"
        title="Missing Repos"
        value={mode}
        onChange={(value) => setMode(value as Mode)}
        info="Placeholders mirror the folder structure without downloading anything; restore each repo on demand."
      >
        <Form.Dropdown.Item value="clone" title="Clone from Origin" icon={Icon.Download} />
        <Form.Dropdown.Item value="placeholders" title="Create Offloaded Placeholders" icon={Icon.Cloud} />
      </Form.Dropdown>
    </Form>
  );
}
