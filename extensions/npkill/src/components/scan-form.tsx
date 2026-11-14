import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { ScanOptions } from "../types";
import { validateRoot } from "../services/path-validation";
import { buildArguments, detectCli, INSTALL_HELP } from "../services/npkill-cli";

export function ScanForm({
  initial,
  onSave,
  navigationTitle,
}: {
  initial: ScanOptions;
  onSave: (options: ScanOptions) => Promise<void>;
  navigationTitle?: string;
}) {
  const [root, setRoot] = useState(initial.root);
  const [loading, setLoading] = useState(false);
  const submission = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => submission.current?.abort(), []);
  async function submit(values: Omit<ScanOptions, "root">) {
    if (submission.current) return;
    const controller = new AbortController();
    submission.current = controller;
    setLoading(true);
    try {
      const validated = await validateRoot(root);
      const options = { ...values, root: validated.path };
      buildArguments(options);
      await detectCli(options.executable, controller.signal);
      if (controller.signal.aborted) return;
      await onSave(options);
    } catch (error) {
      if (controller.signal.aborted) return;
      await showFailureToast(error, { title: "Could Not Start Scan" });
    } finally {
      submission.current = undefined;
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  return (
    <Form
      navigationTitle={navigationTitle}
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save and Scan" icon={Icon.MagnifyingGlass} onSubmit={submit} />
          <Action.OpenInBrowser title="Open Npkill Documentation" url="https://github.com/voidcosmos/npkill" />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Requirements"
        text={`${INSTALL_HELP} Nothing is installed automatically. Scanning does not delete files.`}
      />
      <Form.TextField
        id="root"
        title="Scan Root"
        placeholder="~/Developer"
        value={root}
        onChange={setRoot}
        info="Choose a project directory. The filesystem root cannot be scanned."
      />
      <Form.FilePicker
        id="directoryPicker"
        title="Choose Directory"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        onChange={(paths) => {
          if (paths[0]) setRoot(paths[0]);
        }}
      />
      <Form.TextField
        id="profiles"
        title="Profiles"
        defaultValue={initial.profiles}
        placeholder="node,python,rust"
        info="Comma-separated upstream or custom profile names. Target rules come from npkill. Use all only after reviewing its scope."
      />
      <Form.TextArea
        id="exclusions"
        title="Extra Exclusions"
        defaultValue={initial.exclusions}
        placeholder="work-in-progress"
        info="Directory names, relative or absolute paths, or **/path suffixes. Comma-separated or one per line. General globs are unsupported. Merged with .npkillrc exclusions."
      />
      <Form.Separator />
      <Form.TextField
        id="executable"
        title="npkill Executable"
        defaultValue={initial.executable}
        placeholder="Auto-detect"
        info="Absolute path to an installed npkill CLI, for example /opt/homebrew/bin/npkill. Its directory is also searched for Node.js."
      />
      <Form.TextField
        id="config"
        title="Custom Configuration"
        defaultValue={initial.config}
        placeholder="Automatic .npkillrc discovery"
        info="Optional absolute path. Otherwise npkill checks the scan root, then your home directory."
      />
      <Form.Checkbox
        id="includeSensitive"
        label="Include sensitive results"
        defaultValue={initial.includeSensitive}
        info="Sensitive directories may belong to applications. Cleanup requires an additional confirmation."
      />
    </Form>
  );
}
