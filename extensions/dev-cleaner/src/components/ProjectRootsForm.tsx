import { Action, ActionPanel, Alert, Form, Icon, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import os from "node:os";
import { useState } from "react";

import { normalizeProjectRoots, projectRootWarnings, writeProjectRoots } from "../storage";

interface ProjectRootsFormProps {
  initialRoots?: string[];
  onSave: (roots: string[]) => void;
}

export function ProjectRootsForm({ initialRoots = [], onSave }: ProjectRootsFormProps) {
  const [roots, setRoots] = useState(initialRoots);
  const { pop } = useNavigation();

  async function submit() {
    const normalizedRoots = await normalizeProjectRoots(roots);
    const warnings = await projectRootWarnings(normalizedRoots, os.homedir());
    if (warnings.filesystemRoot) {
      await showToast({ style: Toast.Style.Failure, title: "A filesystem root cannot be scanned" });
      return;
    }
    if (warnings.coversHome) {
      const confirmed = await confirmAlert({
        title: "Scan your entire home directory?",
        message: "This can be slow and may surface unrelated folders named build, dist, or target.",
        primaryAction: { title: "Use Home Directory", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }
    await writeProjectRoots(normalizedRoots);
    onSave(normalizedRoots);
    await showToast({ style: Toast.Style.Success, title: "Project roots saved" });
    pop();
  }

  return (
    <Form
      navigationTitle="Project Scan Roots"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={roots.length === 0 ? "Continue Without Project Scanning" : "Save Project Roots"}
            icon={roots.length === 0 ? Icon.ArrowRight : Icon.CheckCircle}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Developer Cleaner only searches these directories for generated project artifacts. Leave this empty to scan tools and caches only. Symlinks are never followed." />
      <Form.FilePicker
        id="roots"
        title="Project Directories"
        value={roots}
        onChange={setRoots}
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}
