import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { appendFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  listEnvVars,
  NtnError,
  pullEnvToString,
  setEnvVar,
  unsetEnvVar,
  type EnvVar,
  type Worker,
} from "../lib/ntn";
import { useWorkerLocation } from "../lib/workerLocation";
import { formatDateTime } from "../lib/format";
import { SetWorkerLocationForm } from "./SetWorkerLocation";

export default function EnvVarsView({ worker }: { worker: Worker }) {
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      const items = await listEnvVars(worker.workerId);
      items.sort((a, b) => a.key.localeCompare(b.key));
      setVars(items);
    } catch (err) {
      const message = err instanceof NtnError ? err.message : String(err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to list environment variables",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Environment · ${worker.name}`}
      searchBarPlaceholder="Search environment variables"
    >
      {vars.map((v) => (
        <EnvVarItem key={v.key} worker={worker} envVar={v} onChanged={load} />
      ))}
      {!isLoading && vars.length === 0 ? (
        <List.EmptyView
          icon={Icon.Key}
          title="No environment variables"
          description={`${worker.name} has no environment variables set.`}
          actions={
            <ActionPanel>
              <SetEnvVarAction worker={worker} onSet={load} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={load}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

function EnvVarItem({
  worker,
  envVar,
  onChanged,
}: {
  worker: Worker;
  envVar: EnvVar;
  onChanged: () => void;
}) {
  const { push } = useNavigation();
  const [location] = useWorkerLocation(worker.workerId);

  async function runPull(targetDir: string, mode: "append" | "overwrite") {
    const file = join(targetDir, ".env");
    const exists = existsSync(file);
    const verb = mode === "append" ? "Append" : "Overwrite";
    const confirmMessage =
      mode === "append"
        ? `Secret values for ${worker.name} will be appended in plaintext to:\n${file}${exists ? "" : "\n(file will be created)"}`
        : exists
          ? `Existing contents of:\n${file}\nwill be REPLACED with ${worker.name}'s env vars in plaintext.`
          : `${worker.name}'s env vars will be written in plaintext to:\n${file}`;
    const confirmed = await confirmAlert({
      title: `${verb} env to disk?`,
      message: confirmMessage,
      primaryAction: {
        title: verb,
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: mode === "append" ? "Appending env" : "Writing env",
    });
    try {
      const contents = await pullEnvToString(worker.workerId);
      const normalised = contents.endsWith("\n") ? contents : contents + "\n";
      if (mode === "overwrite") {
        await writeFile(file, normalised, "utf8");
      } else {
        const prefix = exists ? "\n" : "";
        await appendFile(file, prefix + normalised, "utf8");
      }
      toast.style = Toast.Style.Success;
      toast.title = mode === "append" ? "Appended env" : "Wrote env";
      toast.message = file;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to pull env";
      toast.message = err instanceof NtnError ? err.message : String(err);
    }
  }

  function handlePull(mode: "append" | "overwrite") {
    if (location) {
      void runPull(location, mode);
      return;
    }
    push(
      <SetWorkerLocationForm
        worker={worker}
        onSaved={(path) => runPull(path, mode)}
      />,
    );
  }

  async function handleUnset() {
    const confirmed = await confirmAlert({
      title: `Unset ${envVar.key}?`,
      message: `This will remove ${envVar.key} from ${worker.name}.`,
      primaryAction: { title: "Unset", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Unsetting ${envVar.key}`,
    });
    try {
      await unsetEnvVar(worker.workerId, envVar.key);
      toast.style = Toast.Style.Success;
      toast.title = `Unset ${envVar.key}`;
      onChanged();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to unset";
      toast.message = err instanceof NtnError ? err.message : String(err);
    }
  }

  return (
    <List.Item
      icon={Icon.Key}
      title={envVar.key}
      accessories={[
        {
          date: new Date(envVar.createdAt),
          tooltip: `Added ${formatDateTime(envVar.createdAt)}`,
        },
      ]}
      actions={
        <ActionPanel>
          <SetEnvVarAction worker={worker} onSet={onChanged} />
          <Action
            title="Unset Environment Variable"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={handleUnset}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
          />
          <Action
            title="Pull Env (Append)"
            icon={Icon.Download}
            onAction={() => handlePull("append")}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          />
          <Action
            title="Pull Env (Overwrite)"
            icon={Icon.Download}
            style={Action.Style.Destructive}
            onAction={() => handlePull("overwrite")}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Variable Name"
              content={envVar.key}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onChanged}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function SetEnvVarAction({
  worker,
  onSet,
}: {
  worker: Worker;
  onSet: () => void;
}) {
  const { push } = useNavigation();
  return (
    <Action
      title="Set Environment Variable"
      icon={Icon.Plus}
      onAction={() => push(<SetEnvVarForm worker={worker} onSet={onSet} />)}
    />
  );
}

function SetEnvVarForm({
  worker,
  onSet,
}: {
  worker: Worker;
  onSet: () => void;
}) {
  const { pop } = useNavigation();
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [keyError, setKeyError] = useState<string | undefined>();

  async function handleSubmit() {
    if (!key.trim()) {
      setKeyError("Name is required");
      return;
    }
    setKeyError(undefined);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Setting ${key}`,
    });
    try {
      await setEnvVar(worker.workerId, key.trim(), value);
      toast.style = Toast.Style.Success;
      toast.title = `Set ${key}`;
      onSet();
      pop();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to set environment variable";
      toast.message = err instanceof NtnError ? err.message : String(err);
    }
  }

  return (
    <Form
      navigationTitle={`Set Env Var · ${worker.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Variable"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="key"
        title="Name"
        placeholder="MY_API_KEY"
        value={key}
        onChange={(v) => {
          setKey(v);
          if (keyError) setKeyError(undefined);
        }}
        error={keyError}
      />
      <Form.PasswordField
        id="value"
        title="Value"
        value={value}
        onChange={setValue}
      />
    </Form>
  );
}
