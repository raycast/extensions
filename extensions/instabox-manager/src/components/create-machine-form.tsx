import {
  Action,
  ActionPanel,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect } from "react";
import { useAccountData } from "../hooks/use-account-data";
import { getMe, getUsage, listTemplates } from "../services/account";
import { createMachine } from "../services/machines";
import { listSnapshots } from "../services/snapshots";
import { CreateMachineRequest } from "../types";
import { errorToast, showError } from "../utils/errors";
import { formatBytes, formatSpec, parseKeyValueLines } from "../utils/format";
import { defaultIdleValue, fixedIdleSeconds, idleOptions, idleTitle } from "../utils/idle";
import { trackOperation } from "../utils/operations";

// The SDK's default template (desktop and browser included), with its fallback.
const DEFAULT_TEMPLATES = ["agent-browser", "universal"];
export const NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;
const LABEL_KEY_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;

// `archiveSeconds` takes 60 s to 24 h.
const STOP_AFTER_OPTIONS = [
  { title: "15 Minutes", value: "900" },
  { title: "30 Minutes", value: "1800" },
  { title: "1 Hour", value: "3600" },
  { title: "2 Hours", value: "7200" },
  { title: "4 Hours", value: "14400" },
  { title: "8 Hours", value: "28800" },
  { title: "24 Hours", value: "86400" },
];

interface FormValues {
  name: string;
  source: string;
  stopAfter: string;
  idle: string;
  startNow: boolean;
  vault: boolean;
  labels: string;
}

interface CreateMachineFormProps {
  /** Preselects `template:<id>` or `snapshot:<id>`. */
  defaultSource?: string;
  /**
   * When given (the form was pushed), the form goes back as soon as InstaBox accepts the request
   * and follows the operation from there. Without it, it waits and then opens Manage Machines.
   */
  onSubmitted?: () => void;
}

export function validateLabels(value: string | undefined) {
  try {
    const labels = parseKeyValueLines(value);
    const invalid = Object.keys(labels).find((key) => !LABEL_KEY_PATTERN.test(key));
    if (invalid) return `"${invalid}" may only use letters, digits, "_", "." and "-"`;
    if (Object.keys(labels).length > 32) return "At most 32 labels";
    const long = Object.entries(labels).find(([, label]) => label.length > 512);
    if (long) return `The value of "${long[0]}" is longer than 512 characters`;
    if (new TextEncoder().encode(JSON.stringify(labels)).length > 8192) return "Labels may take at most 8 KB in all";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export function CreateMachineForm({ defaultSource, onSubmitted }: CreateMachineFormProps) {
  const { pop } = useNavigation();
  const { data: templates, isLoading: loadingTemplates } = useAccountData("templates", listTemplates, {
    onError: errorToast("Could not load templates"),
  });
  const { data: snapshots, isLoading: loadingSnapshots } = useAccountData("snapshots", listSnapshots, {
    onError: () => undefined,
  });
  const { data: usage } = useAccountData("usage", getUsage, { onError: () => undefined });
  const { data: me } = useAccountData("me", getMe, { onError: () => undefined });
  const idleChoices = me ? idleOptions(me) : [];

  const readySnapshots = (snapshots ?? []).filter((snapshot) => snapshot.status === "ready");
  const fallbackTemplate =
    DEFAULT_TEMPLATES.find((id) => templates?.some((template) => template.id === id)) ?? templates?.[0]?.id;

  const { handleSubmit, itemProps, values, setValue } = useForm<FormValues>({
    initialValues: {
      source: defaultSource,
      stopAfter: "0",
      idle: "1800",
      startNow: true,
      vault: false,
      labels: "",
    },
    validation: {
      name: (value) => {
        if (!value) return "Name is required";
        if (!NAME_PATTERN.test(value)) return "Use 1-63 lowercase letters, digits and dashes";
      },
      source: FormValidation.Required,
      labels: validateLabels,
    },
    async onSubmit(values) {
      const [kind, sourceId] = values.source.split(":");
      const body: CreateMachineRequest = {
        name: values.name,
        ...(kind === "snapshot" ? { snapshotId: sourceId } : { templateId: sourceId }),
        desiredState: values.startNow ? "running" : "stopped",
        metadata: parseKeyValueLines(values.labels),
        vault: values.vault,
      };
      if (values.stopAfter !== "0") body.archiveSeconds = Number(values.stopAfter);
      // Without a choice the API applies the account's fixed idle pause, so the field is left out.
      if (idleChoices.some((option) => option.value === values.idle)) {
        body.autoSuspendAfterSeconds = Number(values.idle);
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: `Creating ${values.name}` });
      try {
        const operation = await createMachine(body);
        const track = { title: `Creating ${values.name}`, successTitle: `Created ${values.name}` };
        if (onSubmitted) {
          onSubmitted();
          pop();
          await trackOperation(operation, track, toast);
          onSubmitted();
          return;
        }
        const done = await trackOperation(operation, track, toast);
        if (!done) return;
        try {
          await launchCommand({ name: "manage-machines", type: LaunchType.UserInitiated });
        } catch (error) {
          // The machine was created; only opening Manage Machines failed.
          await showError(error, { title: "Could not open Manage Machines" });
        }
      } catch (error) {
        await showError(error, { toast, title: "Could not create the machine" });
      }
    },
  });

  useEffect(() => {
    if (!values.source && fallbackTemplate) setValue("source", `template:${fallbackTemplate}`);
  }, [fallbackTemplate]);

  useEffect(() => {
    const fallback = defaultIdleValue(idleChoices);
    if (fallback && !idleChoices.some((option) => option.value === values.idle)) setValue("idle", fallback);
  }, [me]);

  const source = values.source;
  const selectedTemplate = templates?.find((template) => source === `template:${template.id}`);
  const selectedSnapshot = readySnapshots.find((snapshot) => source === `snapshot:${snapshot.id}`);
  const atLimit = usage ? usage.machines >= usage.limits.maxMachines : false;

  return (
    <Form
      // Only when pushed: the root command keeps Raycast's own title.
      navigationTitle={onSubmitted || defaultSource ? "Create Machine" : undefined}
      isLoading={loadingTemplates || loadingSnapshots}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Machine" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {atLimit && (
        <Form.Description
          title="⚠️ Limit"
          text={`You have ${usage?.machines} of ${usage?.limits.maxMachines} machines. Delete one before creating another; stopped and paused machines count too.`}
        />
      )}
      <Form.TextField
        {...itemProps.name}
        title="Name"
        placeholder="claude-dev"
        info="Lowercase letters, digits and dashes"
      />
      <Form.Dropdown {...itemProps.source} title="Start From">
        <Form.Dropdown.Section title="Templates">
          {(templates ?? []).map((template) => (
            <Form.Dropdown.Item
              key={template.id}
              value={`template:${template.id}`}
              title={template.id}
              icon={Icon.Box}
            />
          ))}
        </Form.Dropdown.Section>
        {readySnapshots.length > 0 && (
          <Form.Dropdown.Section title="Your Snapshots">
            {readySnapshots.map((snapshot) => (
              <Form.Dropdown.Item
                key={snapshot.id}
                value={`snapshot:${snapshot.id}`}
                title={snapshot.name}
                icon={Icon.SaveDocument}
              />
            ))}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>
      {selectedTemplate?.description && <Form.Description text={selectedTemplate.description} />}
      {selectedSnapshot && (
        <Form.Description
          title="⚠️ Snapshot"
          text={`${formatBytes(selectedSnapshot.rootSizeBytes + (selectedSnapshot.dataSizeBytes ?? 0))} saved from ${selectedSnapshot.sourceMachineId}. Snapshots keep everything under /data/home, such as credentials for gh, Claude, Codex, git and SSH, and .env files. Check what it holds before others use the new machine.`}
        />
      )}
      <Form.Description
        title="Size"
        text={`${formatSpec(usage?.limits.machineSpec ?? { vcpus: 4, memMiB: 8192, persistentDiskGiB: 0 })} (InstaBox gives every machine the same size)`}
      />

      <Form.Separator />
      <Form.Dropdown
        {...itemProps.stopAfter}
        title="Stop After"
        info="Stops the machine this long after it is created, whether or not it is busy. Files are kept, and you can start it again. It can't be changed later."
      >
        <Form.Dropdown.Item value="0" title="Never" />
        {STOP_AFTER_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      {idleChoices.length > 0 && (
        <Form.Dropdown
          {...itemProps.idle}
          title="Pause When Idle"
          info="Pauses after no agent, terminal or CPU activity for this long"
        >
          {idleChoices.map((option) => (
            <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </Form.Dropdown>
      )}
      {me && idleChoices.length === 0 && (
        <Form.Description
          title="Pause When Idle"
          text={`${idleTitle(fixedIdleSeconds(me))} without activity (set by InstaBox for your account)`}
        />
      )}

      <Form.Separator />
      <Form.Checkbox {...itemProps.startNow} title="Start" label="Start the machine right away" />
      <Form.Checkbox
        {...itemProps.vault}
        title="Vault"
        label="Inject Account Vault secrets"
        info="Left off, this machine never receives Vault items, now or later. Anything that runs in it with Vault on can read your secrets."
      />
      <Form.TextArea
        {...itemProps.labels}
        title="Labels"
        placeholder={"task=review\nowner=me"}
        info="Optional key=value labels, one per line"
      />
    </Form>
  );
}
