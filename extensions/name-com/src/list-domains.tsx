import { List } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL, parseResponse } from "./api";

export default function ListDomains() {
    const { isLoading, data } = useFetch(API_URL + "domains", {
        headers: API_HEADERS,
        parseResponse,
        mapResult(result: { domains?: Array<{ domainName: string }> }) {
            return {
                data: result.domains ?? []
            }
        },
        initialData: []
    });

    return <List isLoading={isLoading}>
        <List.EmptyView title="You have no domains. Start your domain search below." />
        {data.map(d => <List.Item key={d.domainName} icon={getFavicon(`https://${d.domainName}`)} title={d.domainName} />)}
    </List>
}