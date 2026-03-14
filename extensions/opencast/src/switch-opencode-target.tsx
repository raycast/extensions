import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getPreferences } from "./lib/preferences";
import { getLastTarget, getRecentTargets, saveRecentTarget } from "./lib/storage";
import type { OpencodeTarget, RecentTarget } from "./lib/types";

export default function Command() {
  const preferences = useMemo(() => getPreferences(), []);
  const [recentTargets, setRecentTargets] = useState<RecentTarget[]>([]);
  const [directory, setDirectory] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [targets, lastTarget] = await Promise.all([getRecentTargets(), getLastTarget()]);
      setRecentTargets(targets);
      const initialTarget: OpencodeTarget | undefined =
        lastTarget ?? (preferences.defaultDirectory ? { directory: preferences.defaultDirectory } : undefined);
      setDirectory(initialTarget?.directory ?? "");
      setWorkspace(initialTarget?.workspace ?? "");
      setIsLoading(false);
    })();
  }, [preferences.defaultDirectory]);

  const recentByKey = useMemo(() => {
    return new Map(recentTargets.map((target) => [`${target.directory}::${target.workspace ?? ""}`, target]));
  }, [recentTargets]);

  async function submit() {
    const target: OpencodeTarget = {
      directory: directory.trim(),
      workspace: workspace.trim() || undefined,
    };
    if (!target.directory) {
      const toast = await showToast({
        style: Toast.Style.Failure,
        title: "Directory is required",
      });
      toast.message = "Enter a repo path or pick a recent target.";
      return;
    }
    await saveRecentTarget(target);
    const toast = await showToast({
      style: Toast.Style.Success,
      title: "OpenCode target updated",
    });
    toast.message = target.workspace ? `${target.directory} (${target.workspace})` : target.directory;
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Set Directory"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Directory" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="recentTarget"
        title="Recent Targets"
        onChange={(value) => {
          const target = recentByKey.get(value);
          if (!target) {
            return;
          }
          setDirectory(target.directory);
          setWorkspace(target.workspace ?? "");
        }}
      >
        {recentTargets.map((target) => (
          <Form.Dropdown.Item
            key={`${target.directory}::${target.workspace ?? ""}`}
            value={`${target.directory}::${target.workspace ?? ""}`}
            title={target.label}
          />
        ))}
      </Form.Dropdown>
      <Form.FilePicker
        id="directory"
        title="Directory"
        info="Choose the local repo folder for OpenCode"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={directory ? [directory] : []}
        onChange={(value) => setDirectory(value[0] ?? "")}
      />
      <Form.TextField
        id="workspace"
        title="Workspace"
        value={workspace}
        onChange={setWorkspace}
        placeholder="Optional workspace ID"
      />
    </Form>
  );
}
