import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useFetch, useForm, FormValidation } from "@raycast/utils";
import { useToken } from "./instances";
import { useComposeContainers } from "./compose-containers";
import DeploymentLogs from "./deployment-logs";
import { parseTrpcJsonResponse, trpcQueryUrl } from "./trpc";
import { ErrorResult } from "./interfaces";

// Schedules also support "server" and "dokploy-server" targets, but this extension has no
// per-server management screen to host those from yet - applications and compose stacks only.
type ScheduleableKind = "application" | "compose";
const ID_FIELDS: Record<ScheduleableKind, string> = {
  application: "applicationId",
  compose: "composeId",
};

const SHELL_TYPES = [
  { value: "bash", title: "Bash" },
  { value: "sh", title: "sh" },
];

interface ScheduleService {
  id: string;
  type: ScheduleableKind;
  name: string;
}

interface Schedule {
  scheduleId: string;
  name: string;
  description?: string | null;
  cronExpression: string;
  command: string;
  shellType?: "bash" | "sh";
  enabled?: boolean;
  timezone?: string | null;
  serviceName?: string | null;
}

/** The scheduled commands for one application or compose stack - separate from backup schedules. */
export default function ServiceSchedules({ service }: { service: ScheduleService }) {
  const { url, headers } = useToken();

  const {
    isLoading,
    data: schedules,
    error,
    revalidate,
  } = useFetch<Schedule[], Schedule[]>(`${url}schedule.list?id=${service.id}&scheduleType=${service.type}`, {
    headers,
    initialData: [],
  });

  async function runNow(schedule: Schedule) {
    const toast = await showToast(Toast.Style.Animated, `Running ${schedule.name}…`);
    try {
      const response = await fetch(url + "schedule.runManually", {
        method: "POST",
        headers,
        body: JSON.stringify({ scheduleId: schedule.scheduleId }),
      });
      if (!response.ok) {
        const err = (await response.json()) as ErrorResult;
        throw new Error(err.message);
      }
      // Unlike backup.manualBackup*, this doesn't reject when the run itself fails - Dokploy
      // catches the command's error internally, marks the deployment "error", and still answers
      // 200. The only way to tell success from failure is this status field.
      const result = (await response.json()) as { status?: string };
      const succeeded = result.status === "done";
      toast.style = succeeded ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = succeeded ? "Run complete" : "Run failed";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not run schedule";
      toast.message = `${error}`;
    }
  }

  async function deleteSchedule(schedule: Schedule) {
    const options: Alert.Options = {
      title: `Delete ${schedule.name}?`,
      message: "This removes the schedule only - anything a past run already did stays done.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete Schedule",
      },
    };
    if (!(await confirmAlert(options))) return;

    const toast = await showToast(Toast.Style.Animated, `Deleting ${schedule.name}…`);
    try {
      const response = await fetch(url + "schedule.delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ scheduleId: schedule.scheduleId }),
      });
      if (!response.ok) {
        const err = (await response.json()) as ErrorResult;
        throw new Error(err.message);
      }
      toast.style = Toast.Style.Success;
      toast.title = `Deleted ${schedule.name}`;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not delete schedule";
      toast.message = `${error}`;
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle={`${service.name} - Schedules`}>
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load schedules"
          description={`${error}`}
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : schedules.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Schedules"
          description={`${service.name} has no scheduled commands yet.`}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Add Schedule"
                target={<ScheduleForm service={service} onSaved={revalidate} />}
              />
              <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : (
        schedules.map((schedule) => (
          <List.Item
            key={schedule.scheduleId}
            icon={{
              source: Icon.Clock,
              tintColor: schedule.enabled === false ? Color.SecondaryText : Color.Green,
            }}
            title={schedule.name}
            subtitle={schedule.cronExpression}
            accessories={[
              ...(schedule.serviceName ? [{ tag: schedule.serviceName, icon: Icon.Box }] : []),
              schedule.enabled === false ? { tag: { value: "Disabled", color: Color.SecondaryText } } : {},
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Pencil}
                  title="Edit Schedule"
                  target={<ScheduleForm service={service} initial={schedule} onSaved={revalidate} />}
                />
                <Action.Push icon={Icon.List} title="View Runs" target={<ScheduleRuns schedule={schedule} />} />
                <Action icon={Icon.Play} title="Run Now" onAction={() => runNow(schedule)} />
                <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => revalidate()} />
                <Action.Push
                  icon={Icon.Plus}
                  title="Add Schedule"
                  target={<ScheduleForm service={service} onSaved={revalidate} />}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Schedule"
                  style={Action.Style.Destructive}
                  onAction={() => deleteSchedule(schedule)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

interface ScheduleRun {
  deploymentId: string;
  title: string;
  description: string | null;
  status: "running" | "done" | "error" | "cancelled";
  createdAt: string;
}

const RUN_STATUS_COLORS: Record<ScheduleRun["status"], Color> = {
  running: Color.Yellow,
  done: Color.Green,
  error: Color.Red,
  cancelled: Color.SecondaryText,
};

/** Past runs of one schedule - `deployment.allByType` isn't on the OpenAPI bridge, same as the rest of the `deployment.*` family. */
function ScheduleRuns({ schedule }: { schedule: Schedule }) {
  const { url, headers } = useToken();

  const {
    isLoading,
    data: runs,
    error,
    revalidate,
  } = useFetch<ScheduleRun[], ScheduleRun[]>(
    trpcQueryUrl(url, "deployment.allByType", { id: schedule.scheduleId, type: "schedule" }),
    {
      headers,
      parseResponse: (response) => parseTrpcJsonResponse<ScheduleRun[]>(response),
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading} navigationTitle={`${schedule.name} - Runs`}>
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load runs"
          description={`${error}`}
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : runs.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Runs Yet"
          description={`${schedule.name} hasn't run yet.`}
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : (
        runs.map((run) => (
          <List.Item
            key={run.deploymentId}
            icon={{ source: Icon.CircleFilled, tintColor: RUN_STATUS_COLORS[run.status] }}
            title={run.title}
            subtitle={run.description ?? undefined}
            accessories={[{ date: new Date(run.createdAt) }, { tag: run.status }]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Terminal} title="View Logs" target={<DeploymentLogs deployment={run} />} />
                <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => revalidate()} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

interface ScheduleFormValues {
  name: string;
  description: string;
  command: string;
  shellType: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  containerServiceName: string;
}

function ScheduleForm({
  service,
  initial,
  onSaved,
}: {
  service: ScheduleService;
  initial?: Schedule;
  onSaved: () => void;
}) {
  const { url, headers } = useToken();
  const { pop } = useNavigation();
  const isCompose = service.type === "compose";

  const { containers, containersLoading, containersError, retryContainers } = useComposeContainers(
    url,
    headers,
    service.id,
    isCompose,
  );

  const { handleSubmit, itemProps } = useForm<ScheduleFormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, `Saving ${values.name}…`);
      try {
        const body: Record<string, unknown> = {
          name: values.name.trim(),
          description: values.description.trim() || null,
          cronExpression: values.cronExpression.trim(),
          command: values.command.trim(),
          shellType: values.shellType,
          // null, not undefined - JSON.stringify drops undefined keys entirely, and
          // schedule.update treats a missing timezone as "leave it alone" rather than "clear it",
          // so clearing this field on Edit would otherwise silently keep the old timezone.
          timezone: values.timezone.trim() || null,
          enabled: values.enabled,
          // Left out on purpose - Dokploy generates its own per-schedule appName and derives the
          // run log path from it. Sending the service's own appName would make every schedule on
          // this service share one log file instead of each getting its own.
          scheduleType: service.type,
          [ID_FIELDS[service.type]]: service.id,
          ...(isCompose ? { serviceName: values.containerServiceName } : {}),
          ...(initial ? { scheduleId: initial.scheduleId } : {}),
        };

        const response = await fetch(url + (initial ? "schedule.update" : "schedule.create"), {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const err = (await response.json()) as ErrorResult;
          throw new Error(err.message);
        }
        toast.style = Toast.Style.Success;
        toast.title = initial ? "Saved schedule" : "Added schedule";
        onSaved();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not save schedule";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      command: initial?.command ?? "",
      shellType: initial?.shellType ?? "bash",
      cronExpression: initial?.cronExpression ?? "0 0 * * *",
      timezone: initial?.timezone ?? "",
      enabled: initial?.enabled ?? true,
      containerServiceName: initial?.serviceName ?? "",
    },
    validation: {
      name: FormValidation.Required,
      command: FormValidation.Required,
      cronExpression: FormValidation.Required,
      containerServiceName: (value) => {
        if (isCompose && !value) return "Select a container";
      },
    },
  });

  return (
    <Form
      isLoading={containersLoading}
      navigationTitle={`${service.name} - ${initial ? "Edit" : "Add"} Schedule`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title={initial ? "Save" : "Add Schedule"} onSubmit={handleSubmit} />
          {isCompose && containersError && (
            <Action icon={Icon.ArrowClockwise} title="Retry Loading Containers" onAction={() => retryContainers()} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Nightly cleanup" {...itemProps.name} />
      <Form.TextArea title="Description" placeholder="What this schedule does" {...itemProps.description} />
      <Form.TextArea
        title="Command"
        placeholder={"npm run cleanup"}
        info="The shell command Dokploy runs on this schedule."
        {...itemProps.command}
      />
      <Form.Dropdown title="Shell Type" {...itemProps.shellType}>
        {SHELL_TYPES.map((shell) => (
          <Form.Dropdown.Item key={shell.value} title={shell.title} value={shell.value} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Cron Expression"
        placeholder="0 0 * * *"
        info="A cron expression - Dokploy runs the command on this schedule."
        {...itemProps.cronExpression}
      />
      <Form.TextField
        title="Timezone"
        placeholder="UTC"
        info="An IANA timezone name, e.g. America/New_York. Leave blank to use Dokploy's default."
        {...itemProps.timezone}
      />
      {isCompose &&
        (containersError ? (
          <Form.Description title="Container" text={`Could not load containers: ${containersError}`} />
        ) : (
          <Form.Dropdown
            title="Container"
            info="Which container in the stack to run this command in."
            {...itemProps.containerServiceName}
          >
            {containers?.map((name) => <Form.Dropdown.Item key={name} title={name} value={name} />)}
          </Form.Dropdown>
        ))}
      <Form.Checkbox title="Enabled" label="Run this schedule on its cron expression" {...itemProps.enabled} />
    </Form>
  );
}
