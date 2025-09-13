import { getPreferenceValues, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type ErrorResult = {
    detail: string;
} | {
    error: {
        message: string;
        type: string;
    }
}
type Monitor = {
    key: string;
    name: string;
}

const {api_key } = getPreferenceValues<Preferences>();
const token = btoa(`${api_key}:`);
export default function SearchMonitors() {
    const {isLoading, data:monitors} = useFetch("https://cronitor.io/api/monitors", {
        headers: {
            Authorization: `Basic ${token}`
        },
        async parseResponse(response) {
            const result = await response.json();
            if (!response.ok) {
                const err = result as ErrorResult;
                throw new Error(("detail" in err) ? err.detail : err.error.message);
            }
            return result;
        },
        mapResult(result: {monitors: Monitor[]}) {
            return {
                data: result.monitors
            }
        },
        initialData: []
    })

    return <List isLoading={isLoading}>
        {monitors.map(monitor => <List.Item key={monitor.key} title={monitor.name} />)}
    </List>
}