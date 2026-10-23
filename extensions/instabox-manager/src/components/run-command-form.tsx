import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedState, useForm } from "@raycast/utils";
import { useEffect } from "react";
import { useMachines } from "../hooks/use-machines";
import { ExecRequest } from "../types";
import { parseKeyValueLines } from "../utils/format";
import { canExec, stateIcon, stateInfo } from "../utils/machine-state";
import { CommandResult } from "./command-result";

const ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Exec answers only once the command exits, and Node's fetch gives up after 300 s without a response,
// so the longest choice leaves a minute for logging in, waking the machine and the network.
const TIMEOUT_OPTIONS = [
  { title: "30 Seconds", value: "30" },
  { title: "1 Minute", value: "60" },
  { title: "2 Minutes", value: "120" },
  { title: "4 Minutes", value: "240" },
];

interface FormValues {
  machineId: string;
  command: string;
  cwd: string;
  timeout: string;
  envs: string;
}

interface RunCommandFormProps {
  machineId?: string;
  command?: string;
}

export function RunCommandForm({ machineId, command }: RunCommandFormProps) {
  const { push } = useNavigation();
  const { data: machines, isLoading } = useMachines();
  const [lastMachineId, setLastMachineId] = useCachedState<string | undefined>("run-command-machine", undefined);

  const { handleSubmit, itemProps, values, setValue } = useForm<FormValues>({
    initialValues: { machineId: machineId ?? lastMachineId, command, timeout: "60", cwd: "", envs: "" },
    validation: {
      machineId: (value) => (value ? undefined : "Choose a machine"),
      command: (value) => (value?.trim() ? undefined : "Enter a command"),
      envs: (value) => {
        try {
          const invalid = Object.keys(parseKeyValueLines(value)).find((name) => !ENV_NAME_PATTERN.test(name));
          if (invalid) return `"${invalid}" is not a valid variable name`;
        } catch (error) {
          return error instanceof Error ? error.message : String(error);
        }
      },
    },
    async onSubmit(values) {
      const machine = machines?.find((candidate) => candidate.id === values.machineId);
      if (!machine) return;
      setLastMachineId(machine.id);
      if (!canExec(machine)) {
        await showToast({
          style: Toast.Style.Failure,
          title: `${machine.name} is ${stateInfo(machine).label.toLowerCase()}`,
          message: "Start or resume it first",
        });
        return;
      }
      const envs = parseKeyValueLines(values.envs);
      const request: ExecRequest = {
        cmd: values.command,
        cwd: values.cwd.trim() || undefined,
        envs: Object.keys(envs).length > 0 ? envs : undefined,
        timeoutSeconds: Number(values.timeout),
      };
      push(<CommandResult machine={machine} request={request} />);
    },
  });

  useEffect(() => {
    if (!machines?.length || machines.some((machine) => machine.id === values.machineId)) return;
    setValue("machineId", (machines.find(canExec) ?? machines[0]).id);
  }, [machines]);

  return (
    <Form
      // Only when pushed from a machine: the root command keeps Raycast's own title.
      navigationTitle={machineId ? "Run Command" : undefined}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Command" icon={Icon.Terminal} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown {...itemProps.machineId} title="Machine">
        {(machines ?? []).map((machine) => (
          <Form.Dropdown.Item
            key={machine.id}
            value={machine.id}
            title={canExec(machine) ? machine.name : `${machine.name} (${stateInfo(machine).label})`}
            icon={stateIcon(machine)}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        {...itemProps.command}
        title="Command"
        placeholder="git status"
        info="Runs with bash -lc as the machine's login user. Output is collected, not streamed; use SSH for interactive work."
      />
      <Form.TextField {...itemProps.cwd} title="Working Directory" placeholder="/data/home" />
      <Form.Dropdown {...itemProps.timeout} title="Timeout">
        {TIMEOUT_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        {...itemProps.envs}
        title="Environment"
        placeholder={"NODE_ENV=test\nDEBUG=1"}
        info="Optional KEY=value variables, one per line"
      />
    </Form>
  );
}
