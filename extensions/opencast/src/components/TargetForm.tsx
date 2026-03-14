import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useMemo, useState } from "react";
import type { OpencodeTarget, RecentTarget } from "../lib/types";

type TargetFormProps = {
  recentTargets: RecentTarget[];
  initialTarget?: OpencodeTarget;
  onSave: (target: OpencodeTarget) => Promise<void>;
};

export function TargetForm(props: TargetFormProps) {
  const { pop } = useNavigation();
  const [directory, setDirectory] = useState(
    props.initialTarget?.directory ?? "",
  );
  const [workspace, setWorkspace] = useState(
    props.initialTarget?.workspace ?? "",
  );

  const recentByKey = useMemo(() => {
    return new Map(
      props.recentTargets.map((target) => [
        `${target.directory}::${target.workspace ?? ""}`,
        target,
      ]),
    );
  }, [props.recentTargets]);

  return (
    <Form
      navigationTitle="Set Directory"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Directory"
            onSubmit={async () => {
              const nextDirectory = directory.trim();
              if (!nextDirectory) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Directory is required",
                });
                return;
              }
              await props.onSave({
                directory: nextDirectory,
                workspace: workspace.trim() || undefined,
              });
              pop();
            }}
          />
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
        {props.recentTargets.map((target) => (
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
