import { FormValidation, useFetch, useForm, useLocalStorage } from "@raycast/utils";
import {
  API_BODY,
  API_HEADERS,
  API_URL,
  DEFAULT_PAGE_LIMIT,
  MONITOR,
  MONITOR_ICONS,
  MONITOR_INTERVALS,
  MONITOR_TYPES,
} from "./config";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { ErrorResponse, Monitor, MonitorStatus, MonitorType, NewMonitor } from "./types";
import { useEffect, useState } from "react";
import unixToDate from "./lib/utils/unix-to-date";
import { hasDayPassed } from "./lib/utils/has-day-passed";
import { createMonitor, deleteMonitor } from "./lib/api";

type Pagination = {
  offset: number;
  limit: number;
  total: number;
};
type MonitorsResult = {
  stat: "ok";
  pagination: Pagination;
  monitors: Monitor[];
};

export default function Monitors() {
  const {
    isLoading: isLoadingLocal,
    value,
    setValue: setMonitors,
  } = useLocalStorage<{ monitors: Monitor[]; updated_at: Date }>("monitors");
  const [execute, setExecute] = useState(false);
  const {
    isLoading,
    pagination,
    data: monitors,
    mutate,
  } = useFetch(
    (options) =>
      API_URL +
      "getMonitors?" +
      new URLSearchParams({
        limit: DEFAULT_PAGE_LIMIT.toString(),
        offset: String(options.page * DEFAULT_PAGE_LIMIT),
      }).toString(),
    {
      headers: API_HEADERS,
      method: "POST",
      body: new URLSearchParams({
        ...API_BODY,
        logs: "1",
      }).toString(),
      mapResult(result: MonitorsResult | ErrorResponse) {
        if (result.stat === "fail") throw result.error.message;

        const page = result.pagination.offset === 0 ? 1 : result.pagination.offset / result.pagination.limit + 1;
        return {
          data: result.monitors,
          hasMore: page * result.pagination.limit > result.pagination.total,
        };
      },
      keepPreviousData: false,
      initialData: [],
      async onData(data) {
        await setMonitors({
          monitors: data,
          updated_at: new Date(),
        });
      },
      execute,
    },
  );
  useEffect(() => {
    if (isLoadingLocal) return;
    if (!value?.monitors.length) setExecute(true);
    else if (value && hasDayPassed(value.updated_at)) setExecute(true);
    else setExecute(false);
  }, [isLoadingLocal, value]);

  async function confirmAndDeleteMonitor(monitor: Monitor) {
    const options: Alert.Options = {
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: "Are you sure?",
      message: `Do you really want to delete ${monitor.friendly_name}? This can't be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    };
    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Deleting monitor", monitor.friendly_name);
      try {
        await mutate(deleteMonitor(monitor.id), {
          optimisticUpdate(data) {
            return data.filter((m) => m.id !== monitor.id);
          },
          shouldRevalidateAfter: false,
        });
        await setMonitors({
          monitors: monitors.filter((m) => m.id !== monitor.id),
          updated_at: new Date(),
        });
        toast.style = Toast.Style.Success;
        toast.title = "Deleted monitor";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.message = `${error}`;
        toast.title = "Could not delete";
      }
    }
  }

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {(value?.monitors ?? monitors).map((monitor) => (
        <List.Item
          key={monitor.id}
          title={monitor.friendly_name}
          subtitle={MonitorType[monitor.type]}
          icon={{ value: MONITOR_ICONS[monitor.status], tooltip: MonitorStatus[monitor.status] }}
          accessories={[
            {
              icon: Icon.Redo,
              text: `${MONITOR_INTERVALS[monitor.interval]}`,
              tooltip: `Checked every ${MONITOR_INTERVALS[monitor.interval]}`,
            },
            { date: unixToDate(monitor.create_datetime) },
          ]}
          actions={
            <ActionPanel>
              <Action icon={Icon.Redo} title="Refresh Monitors" onAction={() => setExecute((prev) => !prev)} />
              <Action.Push
                icon={Icon.Plus}
                title="Add New Monitor"
                target={<AddNewMonitor onMonitorAdded={() => setExecute(true)} />}
              />
              <Action.OpenInBrowser
                icon="up.png"
                title="Open in Dashboard"
                url={`https://dashboard.uptimerobot.com/monitors/${monitor.id}`}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
              <Action
                icon={Icon.Trash}
                title="Delete Monitor"
                onAction={() => confirmAndDeleteMonitor(monitor)}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

type AddNewMonitorProps = {
  onMonitorAdded: () => void;
};
function AddNewMonitor({ onMonitorAdded }: AddNewMonitorProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const { itemProps, handleSubmit, values } = useForm<NewMonitor>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast(Toast.Style.Animated, "Creating monitor", values.friendly_name);
      try {
        const body = { ...values };
        if (values.type === "PING") delete body.interval;
        await createMonitor(body);
        toast.style = Toast.Style.Success;
        toast.title = "Created monitor";
        onMonitorAdded();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.message = `${error}`;
        toast.title = "Could not create";
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      type: MonitorType.HTTP.toString(),
      timeout: "30",
    },
    validation: {
      friendly_name: FormValidation.Required,
      url(value) {
        if (!value) return "The item is required";
        if (values.type === MonitorType.HTTP.toString()) {
          try {
            new URL(value);
          } catch {
            return "The item must be a valid URL";
          }
        }
      },
      type: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Submit Form" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Monitor type" {...itemProps.type}>
        {Object.entries(MONITOR_TYPES).map(([type, { title }]) => (
          <Form.Dropdown.Item key={type} title={title} value={type} />
        ))}
      </Form.Dropdown>
      <Form.Description text={MONITOR_TYPES[values.type].info} />

      <Form.TextField
        title={MONITOR_TYPES[values.type].url.title}
        placeholder={MONITOR_TYPES[values.type].url.placeholder}
        {...itemProps.url}
      />
      <Form.TextField title="Friendly name of monitor" placeholder="blog" {...itemProps.friendly_name} />
      {values.type === "HTTP" && (
        <Form.Dropdown
          title="Monitor interval"
          {...itemProps.interval}
          info="We recommend to use at least 1-minute checks"
        >
          {Object.entries(MONITOR_INTERVALS).map(([interval, title]) => (
            <Form.Dropdown.Item key={interval} title={title} value={interval} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Separator />
      <Form.Description text="Advanced Settings" />
      <Form.Dropdown
        title="Request timeout"
        {...itemProps.timeout}
        info="The shorter the timeout the earlier we mark website as down."
      >
        {Object.entries(MONITOR.TIMEOUTS).map(([timeout, title]) => (
          <Form.Dropdown.Item key={timeout} title={title} value={timeout} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
