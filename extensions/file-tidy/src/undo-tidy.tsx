import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Toast,
  confirmAlert,
  getPreferenceValues,
  popToRoot,
  showToast,
} from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import { useState } from "react";
import { canonicalPath } from "./core/config.js";
import { undoLastRun } from "./core/undo.js";

export default function UndoTidyCommand() {
  const { defaultDest } = getPreferenceValues<Preferences.UndoTidy>();
  const [destError, setDestError] = useState<string | undefined>();

  async function handleSubmit(values: { dest: string[] }) {
    const picked = values.dest[0] ?? defaultDest;
    if (!picked) {
      setDestError("Pick the destination folder of the last tidy run");
      return;
    }
    // Manifests store canonical paths (tidy-folder canonicalizes before
    // executing), so canonicalize here too for consistent cleanup.
    const destDir = canonicalPath(picked);
    const runsDir = path.join(destDir, ".tidy", "runs");
    const runs = fs.existsSync(runsDir)
      ? fs
          .readdirSync(runsDir)
          .filter((f) => f.endsWith(".json"))
          .sort()
      : [];
    if (!runs.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No tidy run to undo",
        message: `No .tidy/runs records under ${destDir} (for in-place runs, pick the source folder itself)`,
      });
      return;
    }

    const { moves, time, sourceDir } = JSON.parse(fs.readFileSync(path.join(runsDir, runs.at(-1)!), "utf8")) as {
      moves: unknown[];
      time: string;
      sourceDir: string;
    };
    const ok = await confirmAlert({
      title: "Undo the last tidy run?",
      message: `Run from ${new Date(time).toLocaleString()}: ${moves.length} files will move back to ${sourceDir}`,
      primaryAction: { title: "Undo", style: Alert.ActionStyle.Default },
    });
    if (!ok) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Undoing…" });
    try {
      const result = undoLastRun(destDir);
      if (result?.retired) {
        toast.style = Toast.Style.Success;
        toast.title = `Undone: ${result.restored} files moved back`;
        toast.message = result.sourceDir;
        await popToRoot();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Partial undo";
        toast.message =
          `${result?.restored ?? 0} moved back, ${result?.failures.length ?? 0} failed ` +
          "(already moved, or a name clash at the original spot). The record is kept — you can retry.";
      }
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Undo failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Undo Last Tidy" icon={Icon.Undo} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="dest"
        title="Destination of Last Run"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        info={
          (defaultDest ? `Leave empty to use the default destination: ${defaultDest}. ` : "") +
          "If the last run was in-place, pick the source folder itself."
        }
        error={destError}
        onChange={() => setDestError(undefined)}
      />
    </Form>
  );
}
