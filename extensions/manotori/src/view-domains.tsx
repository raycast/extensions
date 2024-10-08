import { getFavicon, useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL } from "./config";
import { Domain, DomainDetails, SuccessResult } from "./types";
import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";

export default function ViewDomains() {
    const { isLoading, data } = useFetch(API_URL + "domain", {
        headers: API_HEADERS,
        mapResult(result: SuccessResult<Domain[]>) {
            return {
                data: result.data
            }
        },
        initialData: []
    })

    function getStatusColor(status: string) {
        switch (status) {
            case "ACTIVE":
                return Color.Green;
            default:
                return undefined;
        }
    }

    return <List isLoading={isLoading}>
        {data.map(item => <List.Item key={item.domain_id} icon={getFavicon(`https://${item.domain}`)} title={item.domain} accessories={[
            { tag: {value: item.status, color: getStatusColor(item.status) } },
            { text: `on renewal: ${item.renewal_mode}` }
        ]} actions={<ActionPanel>
            <Action.Push icon={Icon.Eye} title="View Domain Details" target={<ViewDomainDetails domain={item.domain} />} />
        </ActionPanel>} />)}
    </List>
}

function ViewDomainDetails({ domain }: { domain: string }) {
    const { isLoading, data } = useFetch(API_URL + "domain/" + domain, {
        headers: API_HEADERS,
        mapResult(result: SuccessResult<DomainDetails>) {
            return {
                data: result.data
            }
        },
    })

    return <Detail isLoading={isLoading} metadata={data && <Detail.Metadata>
        <Detail.Metadata.Label title="TLD" text={data.tld} />
    </Detail.Metadata>} />
}