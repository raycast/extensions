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
import { useRef, useState } from "react";
import { canonicalPath } from "./core/config.js";
import { getLastRun, undoRun } from "./core/undo.js";
import { describeError } from "./errors.js";

export default function UndoTidyCommand() {
  const { defaultDest } = getPreferenceValues<Preferences.UndoTidy>();
  const [destError, setDestError] = useState<string | undefined>();
  // A ref, not the state flag: two Enter presses land in the same render pass,
  // and both would still see `loading === false`.
  const submittingRef = useRef(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: { dest: string[] }) {
    if (submittingRef.current) return;
    const picked = values.dest[0] ?? defaultDest;
    if (!picked) {
      setDestError("Pick the destination folder of the last tidy run");
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    let toast: Toast | undefined;
    try {
      // Manifests store canonical paths (tidy-folder canonicalizes before
      // executing), so canonicalize here too for consistent cleanup.
      const destDir = canonicalPath(picked);
      const run = getLastRun(destDir);
      if (!run) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No tidy run to undo",
          message: `No .tidy/runs records under ${destDir} (for in-place runs, pick the source folder itself)`,
        });
        return;
      }
      const ok = await confirmAlert({
        title: "Undo the last tidy run?",
        message: `Run from ${new Date(run.time).toLocaleString()}: ${run.moves.length} files will move back to ${run.sourceDir}`,
        primaryAction: { title: "Undo", style: Alert.ActionStyle.Default },
      });
      if (!ok) return;

      toast = await showToast({ style: Toast.Style.Animated, title: "Undoing…" });
      // Undo the run that was described in the prompt, not "whatever is last
      // now" — another run may have finished while the alert was open.
      const result = undoRun(destDir, run.manifestPath);
      if (!result) {
        toast.style = Toast.Style.Failure;
        toast.title = "Tidy run no longer exists";
        toast.message = "It may already have been undone";
      } else if (result.retired) {
        toast.style = Toast.Style.Success;
        toast.title = `Undone: ${result.restored} files moved back`;
        toast.message = result.sourceDir;
        await popToRoot();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Partial undo";
        toast.message =
          `${result.restored} moved back, ${result.failures.length} failed ` +
          "(already moved, or a name clash at the original spot). The record is kept — you can retry.";
      }
    } catch (err) {
      const { title, message } = describeError(err, "Undo failed");
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = title;
        toast.message = message;
      } else {
        await showToast({ style: Toast.Style.Failure, title, message });
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
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
