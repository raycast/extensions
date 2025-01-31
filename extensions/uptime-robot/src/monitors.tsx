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
import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { ErrorResponse, Monitor, NewMonitor } from "./types";
import { useEffect, useState } from "react";
import useUptimeRobot from "./lib/hooks/use-uptime-robot";
import unixToDate from "./lib/utils/unix-to-date";
import { hasDayPassed } from "./lib/utils/has-day-passed";

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
      keepPreviousData: true,
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
  }, [isLoadingLocal]);

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {(value?.monitors ?? monitors).map((monitor) => (
        <List.Item
          key={monitor.id}
          title={monitor.friendly_name}
          icon={MONITOR_ICONS[monitor.status]}
          accessories={[
            { icon: Icon.Redo },
            { text: `${monitor.interval / 60} min` },
            { date: unixToDate(monitor.create_datetime) },
          ]}
          actions={
            <ActionPanel>
              <Action icon={Icon.Redo} title="Refresh Monitors" onAction={() => setExecute((prev) => !prev)} />
              <Action.Push
                icon={Icon.Plus}
                title="Add New Monitor"
                target={<AddNewMonitor onMonitorAdded={() => setExecute((prev) => !prev)} />}
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
  const [execute, setExecute] = useState(false);
  const { itemProps, handleSubmit, values } = useForm<NewMonitor>({
    onSubmit() {
      setExecute(true);
    },
    initialValues: {
      url: "https://",
      timeout: "30",
    },
    validation: {
      friendly_name: FormValidation.Required,
      url(value) {
        if (!value) return "The item is required";
        else {
          try {
            new URL(value);
          } catch (_) {
            return "The item must be a valid URL";
          }
        }
      },
      type: FormValidation.Required,
    },
  });

  const { isLoading } = useUptimeRobot<Monitor, "monitor">("newMonitor", values, {
    onData() {
      onMonitorAdded();
      pop();
    },
    onError() {
      setExecute(false);
    },
    execute,
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
      <Form.Description text={MONITOR_TYPES[values.type]?.info || ""} />

      <Form.TextField
        title="URL to monitor"
        placeholder="https://example.com or http://80.75.11.12"
        {...itemProps.url}
      />
      <Form.TextField title="Friendly name of monitor" placeholder="blog" {...itemProps.friendly_name} />
      <Form.Dropdown
        title="Monitor interval"
        {...itemProps.interval}
        info="We recommend to use at least 1-minute checks"
      >
        {Object.entries(MONITOR_INTERVALS).map(([interval, title]) => (
          <Form.Dropdown.Item key={interval} title={title} value={interval} />
        ))}
      </Form.Dropdown>

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
