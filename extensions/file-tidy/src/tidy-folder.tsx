import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  open,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import fs from "node:fs";
import { useState } from "react";
import { buildExtIndex, isInsideDir, loadConfig } from "./core/config.js";
import { findDuplicates } from "./core/dedup.js";
import { executePlan } from "./core/execute.js";
import { buildPlan, formatSize, type PlanEntry } from "./core/plan.js";
import { scanDest, scanSource } from "./core/scan.js";

interface Preferences {
  defaultDest?: string;
}

interface FormValues {
  source: string[];
  dest: string[];
  inPlace: boolean;
  recursive: boolean;
}

export default function TidyFolderCommand() {
  const { push } = useNavigation();
  const { defaultDest } = getPreferenceValues<Preferences>();
  const [sourceError, setSourceError] = useState<string | undefined>();
  const [destError, setDestError] = useState<string | undefined>();
  const [inPlace, setInPlace] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    const sourceDir = values.source[0];
    if (!sourceDir) {
      setSourceError("Pick a folder to tidy");
      return;
    }
    const destDir = values.inPlace ? sourceDir : (values.dest[0] ?? defaultDest);
    if (!destDir) {
      setDestError("Pick a destination folder, or set a default one in the extension preferences");
      return;
    }
    if (!values.inPlace && isInsideDir(sourceDir, destDir)) {
      setDestError("Destination can't be inside the source folder; enable “Tidy in place” instead");
      return;
    }

    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Scanning…" });
    try {
      const config = loadConfig();
      const organizedDirs = new Set([...Object.keys(config.categories), config.fallbackCategory, "Duplicates"]);
      const sourceFiles = scanSource(sourceDir, {
        recursive: values.recursive,
        excludeTopDirs: values.inPlace ? organizedDirs : undefined,
      });
      if (!sourceFiles.length) {
        toast.style = Toast.Style.Failure;
        toast.title = "Nothing to tidy";
        toast.message = "Hidden files and subfolders are skipped; enable “Include subfolders” to recurse";
        return;
      }
      const destFiles = scanDest(destDir, values.inPlace ? { onlyDirs: organizedDirs } : undefined);
      const duplicates = await findDuplicates(sourceFiles, destFiles);
      const entries = await buildPlan({
        sourceFiles,
        duplicates,
        destDir,
        extIndex: buildExtIndex(config),
        fallbackCategory: config.fallbackCategory,
      });
      await toast.hide();
      push(<PlanView entries={entries} sourceDir={sourceDir} destDir={destDir} />);
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Scan failed";
      toast.message = err instanceof Error ? err.message : String(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview Tidy Plan" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="source"
        title="Folder to Tidy"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        error={sourceError}
        onChange={() => setSourceError(undefined)}
      />
      <Form.Checkbox
        id="inPlace"
        label="Tidy in place (create category folders inside the source folder)"
        value={inPlace}
        onChange={setInPlace}
      />
      {!inPlace && (
        <Form.FilePicker
          id="dest"
          title="Destination"
          allowMultipleSelection={false}
          canChooseDirectories
          canChooseFiles={false}
          info={
            defaultDest
              ? `Leave empty to use the default destination: ${defaultDest}`
              : "Leave empty to use the default destination from preferences (not set yet)"
          }
          error={destError}
          onChange={() => setDestError(undefined)}
        />
      )}
      <Form.Checkbox id="recursive" label="Include subfolders" defaultValue={false} />
      <Form.Description text="You'll see the full plan first — nothing moves until you confirm." />
    </Form>
  );
}

function PlanView({ entries, sourceDir, destDir }: { entries: PlanEntry[]; sourceDir: string; destDir: string }) {
  const archives = entries.filter((e) => e.action === "archive");
  const dups = entries.filter((e) => e.action === "duplicate");

  const byBucket = new Map<string, PlanEntry[]>();
  for (const e of archives) {
    const bucket = `${e.category}/${e.yearMonth}`;
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), e]);
  }

  async function execute() {
    const destMissing = !fs.existsSync(destDir);
    const ok = await confirmAlert({
      title: destMissing ? "Create destination and tidy?" : "Run this tidy plan?",
      message:
        `${destMissing ? `Destination ${destDir} doesn't exist and will be created.\n` : ""}` +
        `Archive ${archives.length} files, quarantine ${dups.length} duplicates → ${destDir}`,
      primaryAction: { title: "Tidy", style: Alert.ActionStyle.Default },
    });
    if (!ok) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Tidying…" });
    try {
      const { moved } = executePlan(entries, { destDir, sourceDir });
      const dupCount = moved.filter((e) => e.action === "duplicate").length;
      toast.style = Toast.Style.Success;
      toast.title = `Done: ${moved.length - dupCount} archived, ${dupCount} duplicates quarantined`;
      toast.message = "Use “Undo Last Tidy” to revert";
      toast.primaryAction = {
        title: "Open Destination",
        onAction: () => open(destDir),
      };
      await popToRoot();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Tidy failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  const executeAction = (
    <ActionPanel>
      <Action title="Run Tidy Plan" icon={Icon.Checkmark} onAction={execute} />
      <Action.ShowInFinder title="Show Source Folder" path={sourceDir} />
    </ActionPanel>
  );

  return (
    <List navigationTitle={`Tidy Plan → ${destDir} (${entries.length} files)`}>
      {[...byBucket.keys()].sort().map((bucket) => (
        <List.Section key={bucket} title={bucket} subtitle={`${byBucket.get(bucket)!.length} files`}>
          {byBucket.get(bucket)!.map((e) => (
            <List.Item
              key={e.from}
              title={e.name}
              icon={Icon.Document}
              accessories={[
                { text: formatSize(e.size) },
                {
                  tag:
                    e.dateSource === "exif"
                      ? { value: "EXIF", color: Color.Green }
                      : { value: "file date", color: Color.SecondaryText },
                },
              ]}
              actions={executeAction}
            />
          ))}
        </List.Section>
      ))}
      {dups.length > 0 && (
        <List.Section title="Duplicates (quarantined)" subtitle={`${dups.length} files`}>
          {dups.map((e) => (
            <List.Item
              key={e.from}
              title={e.name}
              subtitle={`identical to ${e.keeperPath}`}
              icon={{ source: Icon.Duplicate, tintColor: Color.Magenta }}
              accessories={[{ text: formatSize(e.size) }]}
              actions={executeAction}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
