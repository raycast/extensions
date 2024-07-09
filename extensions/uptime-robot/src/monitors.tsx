import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { API_HEADERS, API_KEY, API_URL, DEFAULT_PAGE_LIMIT, MONITOR, MONITOR_INTERVALS, MONITOR_TYPES } from "./config";
import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { ErrorResponse, NewMonitor } from "./types";
import { useState } from "react";
import useUptimeRobot from "./lib/hooks/use-uptime-robot";

type Pagination = {
    offset: number;
    limit: number;
    total: number;
}
// type MonitorLog = {
//     id: number;
//     type: number;
//     datetime: number;
//     duration: number;
//     reason: {
//         code: number;
//         detail: string;
//     }
// }
type Monitor = {
    id: number;
    friendly_name: string;
    url: string;
    type: number
    sub_type: string;
    keyword_type: number;
    keyword_case_type: number;
    keyword_value: string;
    http_username: string;
    http_password: string;
    port: string;
    interval: number;
    timeou: number;
    status: number;
    create_datetime: number;
    // logs: MonitorLog[];
    // "all_time_uptime_ratio": "0.000",
    // "all_time_uptime_durations": "0-38-3148",
    // "lastLogTypeBeforeStartDate": {}
}
type MonitorsResult = {
    stat: "ok";
    pagination: Pagination;
    monitors: Monitor[];
}

export default function Monitors() {
    const { isLoading, data: monitors, pagination, revalidate } = useFetch(
        (options) =>
          API_URL + "getMonitors?" +
          new URLSearchParams({ limit: DEFAULT_PAGE_LIMIT.toString(), offset: String(options.page*DEFAULT_PAGE_LIMIT) }).toString(),
        {
            headers: API_HEADERS,
            method: "POST",
            body: new URLSearchParams({
                api_key: API_KEY,
                format: "json"
            }).toString(),
          mapResult(result: MonitorsResult | ErrorResponse) {
            if (result.stat==="fail") throw(result.error.message);

            const page = result.pagination.offset===0 ? 1 : (result.pagination.offset/result.pagination.limit + 1);
            return {
              data: result.monitors,
              hasMore: (page*result.pagination.limit>result.pagination.total)
            };
          },
          keepPreviousData: true,
          initialData: [],
        },
      );

      return <List isLoading={isLoading} pagination={pagination}>
        {!isLoading && !monitors ? <List.EmptyView /> :
        monitors.map(monitor => <List.Item key={monitor.id} title={monitor.friendly_name} icon={monitor.status===0 ? Icon.Pause : monitor.status===1 ? Icon.Play : Icon.Dot} accessories={[
            { icon: Icon.Redo },
            {text: `${monitor.interval/60} min`},
            { date: new Date(monitor.create_datetime) }
        ]} actions={<ActionPanel>
            <Action.Push title="Add New Monitor" target={<AddNewMonitor onMonitorAdded={revalidate} />} />
        </ActionPanel>} />)}
      </List>
}

type AddNewMonitorProps = {
    onMonitorAdded: () => void;
}
function AddNewMonitor({ onMonitorAdded }: AddNewMonitorProps) {
    const { pop } = useNavigation();
    const [execute, setExecute] = useState(false);
    const { itemProps, handleSubmit, values } = useForm<NewMonitor>({
        onSubmit() {
            setExecute(true);
        },
        initialValues: {
            url: "https://",
            timeout: "30"
        },
        validation: {
            friendly_name: FormValidation.Required,
            url(value) {
                if (!value) return "The item is required";
                else {
                    try {
                        new URL(value);
                    } catch (_) {
                        return "The item must be a valid URL"
                    }
                }
            },
            type: FormValidation.Required,
        }
    });

    const { isLoading } = useUptimeRobot<Monitor, "monitor">("newMonitor", values, {
        onData() {
            onMonitorAdded();
            pop()
        },
        onError() {
            setExecute(false);
        },
        execute
    });

    return <Form isLoading={isLoading} actions={<ActionPanel>
        <Action.SubmitForm icon={Icon.Check} title="Submit Form" onSubmit={handleSubmit} />
    </ActionPanel>}>
    <Form.Dropdown title="Monitor type" {...itemProps.type}>
        {Object.entries(MONITOR_TYPES).map(([type, { title }]) => <Form.Dropdown.Item key={type} title={title} value={type} />)}
    </Form.Dropdown>
    <Form.Description text={MONITOR_TYPES[values.type as keyof typeof MONITOR_TYPES]?.info || ""} />

    <Form.TextField title="URL to monitor" placeholder="https://example.com or http://80.75.11.12" {...itemProps.url} />
    <Form.TextField title="Friendly name of monitor" placeholder="blog" {...itemProps.friendly_name} />
    <Form.Dropdown title="Monitor interval" {...itemProps.interval} info="We recommend to use at least 1-minute checks">
        {Object.entries(MONITOR_INTERVALS).map(([interval, title]) => <Form.Dropdown.Item key={interval} title={title} value={interval} />)}
    </Form.Dropdown>

    <Form.Separator />
    <Form.Description text="Advanced Settings" />
    <Form.Dropdown title="Request timeout" {...itemProps.timeout} info="The shorter the timeout the earlier we mark website as down.">
        {Object.entries(MONITOR.TIMEOUTS).map(([timeout, title]) => <Form.Dropdown.Item key={timeout} title={title} value={timeout} />)}
    </Form.Dropdown>
    </Form>
}