import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import {
  getDefaultWorkerLocation,
  useWorkerLocation,
} from "../lib/workerLocation";
import type { Worker } from "../lib/ntn";

type OnSaved = (path: string) => void | Promise<void>;

export function SetWorkerLocationAction({
  worker,
  onSaved,
  title,
}: {
  worker: Worker;
  onSaved?: OnSaved;
  title?: string;
}) {
  const { push } = useNavigation();
  return (
    <Action
      title={title ?? "Set Worker Location"}
      icon={Icon.Folder}
      onAction={() =>
        push(<SetWorkerLocationForm worker={worker} onSaved={onSaved} />)
      }
    />
  );
}

export function SetWorkerLocationForm({
  worker,
  onSaved,
}: {
  worker: Worker;
  onSaved?: OnSaved;
}) {
  const { pop } = useNavigation();
  const [location, setLocation] = useWorkerLocation(worker.workerId);
  const initial = location ?? getDefaultWorkerLocation(worker.name);
  const [path, setPath] = useState<string>(initial);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit() {
    const trimmed = path.trim();
    if (!trimmed) {
      setError("Enter or browse to a folder for this worker");
      return;
    }
    setError(undefined);
    setLocation(trimmed);
    await showToast({
      style: Toast.Style.Success,
      title: `Saved location for ${worker.name}`,
      message: trimmed,
    });
    pop();
    if (onSaved) {
      setTimeout(() => {
        void onSaved(trimmed);
      }, 50);
    }
  }

  return (
    <Form
      navigationTitle={`Set Location · ${worker.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Location"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Local folder for ${worker.name}. Pull Env will write to <folder>/.env.`}
      />
      <Form.TextField
        id="path"
        title="Path"
        placeholder="/Users/you/Github/my-worker"
        value={path}
        onChange={(v) => {
          setPath(v);
          if (error) setError(undefined);
        }}
        error={error}
      />
      <Form.FilePicker
        id="browse"
        title="Browse"
        info="Pick a folder to fill in the Path field above."
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={picked}
        onChange={(v) => {
          setPicked(v);
          const next = v[0];
          if (next) {
            setPath(next);
            if (error) setError(undefined);
          }
        }}
      />
    </Form>
  );
}
